"""Small real water lens and one seamless rounded glass platform, Cycles RGBA."""
import bpy, math
from pathlib import Path
from mathutils import Vector
project=Path(__file__).resolve().parent.parent

def material(name,color,transmission=0,roughness=.06,ior=1.5):
    m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF')
    for k,v in {'Base Color':(*color,1),'Transmission Weight':transmission,'Roughness':roughness,'IOR':ior}.items():p.inputs[k].default_value=v
    return m

def aim(obj,point=(0,0,0)):obj.rotation_euler=(Vector(point)-obj.location).to_track_quat('-Z','Y').to_euler()

def area(name,pos,color,power,width,height):
    d=bpy.data.lights.new(name,'AREA');d.shape='RECTANGLE';d.energy=power;d.color=color;d.size=width;d.size_y=height
    o=bpy.data.objects.new(name,d);bpy.context.scene.collection.objects.link(o);o.location=pos;aim(o)

def studio(width,height,scale,position):
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.samples=64;s.cycles.max_bounces=14;s.cycles.transmission_bounces=12
    s.render.use_persistent_data=False;s.cycles.use_adaptive_sampling=True;s.cycles.adaptive_threshold=.01
    s.view_layers[0].cycles.use_denoising=True;s.cycles.denoiser='OPENIMAGEDENOISE';s.cycles.denoising_use_gpu=True
    prefs=bpy.context.preferences.addons['cycles'].preferences;prefs.compute_device_type='OPTIX';prefs.get_devices()
    for device in prefs.devices:device.use=device.type=='OPTIX'
    s.cycles.device='GPU';s.render.film_transparent=True;s.render.image_settings.file_format='PNG';s.render.image_settings.color_mode='RGBA'
    s.render.resolution_x=width;s.render.resolution_y=height;s.render.resolution_percentage=100;s.view_settings.view_transform='AgX'
    w=bpy.data.worlds.new('Quiet amethyst reflections');w.use_nodes=True;w.node_tree.nodes.get('Background').inputs['Color'].default_value=(.035,.017,.07,1);w.node_tree.nodes.get('Background').inputs['Strength'].default_value=.35;s.world=w
    d=bpy.data.cameras.new('Asset camera');o=bpy.data.objects.new(d.name,d);s.collection.objects.link(o);o.location=position;aim(o);d.type='ORTHO';d.ortho_scale=scale;s.camera=o
    return s

s=studio(1024,1024,2.6,(0,-6,0))
bpy.ops.mesh.primitive_uv_sphere_add(segments=96,ring_count=64,radius=1)
drop=bpy.context.object;drop.name='Water lens with real refraction';drop.scale=(.75,.25,.96);drop.data.materials.append(material('Water IOR 1.333',(.97,.96,1),1,.025,1.333))
for polygon in drop.data.polygons:polygon.use_smooth=True
area('Soft white rim',(-2,-3,3),(.9,.82,1),320,2.2,2.5)
area('Low violet bounce',(2,-1,-2),(.43,.16,1),190,1.4,1.8)
s.render.filepath=str(project/'render/crystal/depth-water-drop.png');bpy.ops.render.render(write_still=True)

s=studio(3840,900,19.2,(0,-14,9))
s.camera.data.type='PERSP';s.camera.data.lens=31
# A rounded XY perimeter avoids a thin cube bevel's clamped sharp corners.
points=[]
for x,y,start in [(8.6,1.1,0),(-8.6,1.1,90),(-8.6,-1.1,180),(8.6,-1.1,270)]:
    for i in range(17):
        a=math.radians(start+i*90/16);points.append((x+.4*math.cos(a),y+.4*math.sin(a)))
n=len(points);verts=[(x,y,z) for z in (-.10,.10) for x,y in points]
faces=[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
m=bpy.data.meshes.new('Continuous rounded platform');m.from_pydata(verts,[],faces);m.update()
o=bpy.data.objects.new(m.name,m);s.collection.objects.link(o);o.data.materials.append(material('Smoked optical amethyst',(.13,.045,.28),.91,.075,1.48))
bevel=o.modifiers.new('Soft polished edge','BEVEL');bevel.width=.045;bevel.segments=6;o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
area('Wide lavender reflection',(-2,-5,7),(.72,.52,1),1100,12,4)
area('Broad violet return',(4,-4,5),(.48,.18,1),260,9,6)
area('Lower edge fill',(-6,-3,1),(.61,.37,1),180,4,1)
s.render.filepath=str(project/'render/crystal/depth-glass-shelf-4k.png');bpy.ops.render.render(write_still=True)
