"""Render the Cingy.Tech hero as a real Cycles glass animation.

Run with Blender in background mode, for example:
  blender -b -t 0 --python art/render_glass_hero.py -- --width 960 --height 540 --samples 24 --output render/hero
"""

import argparse
import math
import os
import sys

import bpy
from mathutils import Vector


parser = argparse.ArgumentParser()
parser.add_argument("--width", type=int, default=960)
parser.add_argument("--height", type=int, default=540)
parser.add_argument("--samples", type=int, default=32)
parser.add_argument("--start", type=int, default=1)
parser.add_argument("--end", type=int, default=1)
parser.add_argument("--output", default="render/hero")
parser.add_argument("--save-blend", default="")
parser.add_argument("--no-render", action="store_true")
args = parser.parse_args(sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else [])

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.samples = args.samples
scene.cycles.use_light_tree = True
scene.render.resolution_x = args.width
scene.render.resolution_y = args.height
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.render.film_transparent = True
scene.render.filepath = os.path.abspath(args.output)
scene.frame_start = args.start
scene.frame_end = args.end
scene.render.fps = 24
scene.view_settings.view_transform = "AgX"

view_layer = scene.view_layers[0]
view_layer.cycles.use_denoising = True

try:
    preferences = bpy.context.preferences.addons["cycles"].preferences
    preferences.compute_device_type = "CUDA"
    preferences.get_devices()
    for device in preferences.devices:
        device.use = device.type == "CUDA"
    scene.cycles.device = "GPU" if any(device.use for device in preferences.devices) else "CPU"
    print("CYCLES_DEVICE", [(device.name, device.type, device.use) for device in preferences.devices])
except Exception as error:
    scene.cycles.device = "CPU"
    print("CYCLES_CPU_FALLBACK", error)


def material(name, *, color, metallic=0.0, roughness=0.04, transmission=0.0, ior=1.45, emission=None):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1.0)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1.0)
    shader.inputs["Metallic"].default_value = metallic
    shader.inputs["Roughness"].default_value = roughness
    shader.inputs["Transmission Weight"].default_value = transmission
    shader.inputs["IOR"].default_value = ior
    if emission:
        shader.inputs["Emission Color"].default_value = (*emission[0], 1.0)
        shader.inputs["Emission Strength"].default_value = emission[1]
    return mat


crystal = material("Optical amethyst glass", color=(0.39, 0.23, 0.72), roughness=0.018, transmission=0.95, ior=1.5)
ice = material("Pale violet glass", color=(0.77, 0.69, 1.0), roughness=0.012, transmission=0.98, ior=1.47)
chrome = material("Smoked violet chrome", color=(0.19, 0.12, 0.34), metallic=0.86, roughness=0.09)
core_mat = material("Luminous polished core", color=(0.25, 0.035, 0.72), metallic=0.48, roughness=0.08, transmission=0.0, ior=1.42, emission=((0.5, 0.08, 1.0), 0.72))

root = bpy.data.objects.new("Orbit assembly", None)
scene.collection.objects.link(root)


def torus(name, radius, tube, rotation, mat, parent=root):
    bpy.ops.mesh.primitive_torus_add(major_segments=192, minor_segments=40, major_radius=radius, minor_radius=tube)
    obj = bpy.context.object
    obj.name = name
    obj.rotation_euler = rotation
    obj.parent = parent
    obj.data.materials.append(mat)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    return obj


outer = torus("Outer smoked chrome orbit", 1.55, 0.15, (math.radians(66), math.radians(10), math.radians(-18)), chrome)
middle = torus("Inner glass orbit", 1.32, 0.12, (math.radians(12), math.radians(73), math.radians(18)), ice)
front = torus("Crossing amethyst orbit", 1.13, 0.105, (math.radians(70), math.radians(-48), math.radians(26)), crystal)
accent = torus("Fine crystal edge", 1.63, 0.018, (math.radians(66), math.radians(10), math.radians(-18)), ice)


def ribbon(name, phase, mat, radius=1.51, tube=0.08):
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 24
    curve.bevel_depth = tube
    curve.bevel_resolution = 5
    spline = curve.splines.new("POLY")
    count = 260
    spline.points.add(count - 1)
    for index, point in enumerate(spline.points):
        angle = 2 * math.pi * index / count
        latitude = 0.45 * math.sin(2.0 * angle + phase)
        x = radius * math.cos(latitude) * math.cos(angle)
        y = radius * math.cos(latitude) * math.sin(angle)
        z = radius * math.sin(latitude)
        point.co = (x, y, z, 1)
    spline.use_cyclic_u = True
    obj = bpy.data.objects.new(name, curve)
    scene.collection.objects.link(obj)
    obj.parent = root
    obj.data.materials.append(mat)
    return obj


strand = ribbon("Sculpted glass helix", 0.6, ice, tube=0.073)
second_strand = ribbon("Countertwist glass helix", 2.7, crystal, radius=1.38, tube=0.055)

bpy.ops.mesh.primitive_uv_sphere_add(segments=96, ring_count=48, radius=0.32)
core = bpy.context.object
core.name = "Faceted luminous heart"
core.parent = root
core.data.materials.append(core_mat)
for polygon in core.data.polygons:
    polygon.use_smooth = True

def point_at(obj, target=(0, 0, 0)):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def area(name, location, color, energy, size, size_y, target=(0, 0, 0)):
    data = bpy.data.lights.new(name, "AREA")
    data.energy = energy
    data.color = color
    data.shape = "RECTANGLE"
    data.size = size
    data.size_y = size_y
    obj = bpy.data.objects.new(name, data)
    scene.collection.objects.link(obj)
    obj.location = location
    point_at(obj, target)


# Long soft boxes create visible studio reflections in the glass.
area("Large cool key", (-3.5, -3.8, 4.8), (0.92, 0.84, 1.0), 560, 4.6, 1.1)
area("Violet rim", (3.8, 1.5, 2.0), (0.64, 0.27, 1.0), 1350, 3.8, 1.2)
area("White strip reflection", (0.6, -4.2, 2.6), (0.92, 0.82, 1.0), 360, 0.38, 4.5)
area("Lower lilac bounce", (-1.8, -1.7, -3.0), (0.55, 0.32, 1.0), 680, 3.0, 1.6)
area("Rear edge", (0.0, 3.2, 3.0), (0.8, 0.64, 1.0), 850, 3.2, 2.2)

world = bpy.data.worlds.new("Deep violet studio")
scene.world = world
world.use_nodes = True
background = world.node_tree.nodes.get("Background")
background.inputs["Color"].default_value = (0.035, 0.027, 0.075, 1)
background.inputs["Strength"].default_value = 0.2

camera_data = bpy.data.cameras.new("Hero camera")
camera = bpy.data.objects.new("Hero camera", camera_data)
scene.collection.objects.link(camera)
camera.location = (0, -7.8, 0.45)
point_at(camera)
camera_data.type = "ORTHO"
camera_data.ortho_scale = 5.9
scene.camera = camera

if args.save_blend:
    blend_path = os.path.abspath(args.save_blend)
    os.makedirs(os.path.dirname(blend_path), exist_ok=True)
    # Keep the editable Blender file animated, even though the batch renderer
    # sets each frame explicitly to guarantee uniform motion and a clean loop.
    scene.frame_start = 1
    scene.frame_end = 120
    for frame in range(1, 122):
        angle = 2 * math.pi * (frame - 1) / 120
        root.rotation_euler = (angle, 0, angle)
        root.keyframe_insert(data_path="rotation_euler", frame=frame)
    scene.frame_set(1)
    bpy.ops.wm.save_as_mainfile(filepath=blend_path)
    root.animation_data_clear()

if args.no_render:
    raise SystemExit(0)

scene.render.filepath = os.path.abspath(args.output)
os.makedirs(os.path.dirname(scene.render.filepath), exist_ok=True)
if args.start == args.end:
    angle = 2 * math.pi * (args.start - 1) / 120
    root.rotation_euler = (angle, 0, angle)
    scene.frame_set(args.start)
    bpy.ops.render.render(write_still=True)
else:
    for frame in range(args.start, args.end + 1):
        # The full turn over 120 frames makes a seamless five-second loop.
        angle = 2 * math.pi * (frame - 1) / 120
        root.rotation_euler = (angle, 0, angle)
        scene.frame_set(frame)
        scene.render.filepath = f"{os.path.abspath(args.output)}_{frame:04d}.png"
        bpy.ops.render.render(write_still=True)
