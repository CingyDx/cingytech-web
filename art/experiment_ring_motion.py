"""Local low-resolution Cycles motion studies; never overwrites site assets."""
import argparse, math, sys, time, json
from pathlib import Path
import bpy
from mathutils import Quaternion, Vector

p=argparse.ArgumentParser()
p.add_argument('--variant', choices=['together','counter','phases','continuous'], required=True)
p.add_argument('--frames', type=int, default=288)
p.add_argument('--fps', type=int, default=24)
p.add_argument('--size', type=int, default=640)
p.add_argument('--end', type=int)
p.add_argument('--samples', type=int, default=16)
a=p.parse_args(sys.argv[sys.argv.index('--')+1:])
project=Path(__file__).resolve().parent.parent
output=project/'render/crystal/motion-studies'/a.variant
output.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(project/'art/crystal-flow.blend'))
scene=bpy.context.scene
assembly=bpy.data.objects['Orbit assembly']
parts=[o for o in bpy.data.objects if o.parent==assembly]
for obj in [assembly,*parts]:obj.animation_data_clear()
base={o.name:o.rotation_euler.to_quaternion() for o in parts}
locations={o.name:o.location.copy() for o in parts}
scene.render.resolution_x=scene.render.resolution_y=a.size
scene.render.resolution_percentage=100
scene.camera.data.ortho_scale=4.5
scene.cycles.samples=a.samples
scene.cycles.adaptive_threshold=.04
scene.render.use_persistent_data=False
scene.render.fps=a.fps
scene.frame_start=1;scene.frame_end=a.frames
prefs=bpy.context.preferences.addons['cycles'].preferences
prefs.compute_device_type='OPTIX';prefs.get_devices()
for device in prefs.devices:device.use=device.type=='OPTIX'
scene.cycles.device='GPU' if any(d.use for d in prefs.devices) else 'CPU'
print('STUDY_DEVICE',[(d.name,d.type,d.use) for d in prefs.devices],flush=True)

def turn(names,axis,angle):
    for name in names:
        obj=bpy.data.objects.get(name)
        if obj:
            obj.rotation_mode='QUATERNION'
            obj.rotation_quaternion=Quaternion(axis,angle)@base[name]

def pose(frame):
    t=2*math.pi*(frame-1)/a.frames
    assembly.rotation_euler=(.24+.12*math.sin(t),.18+.38*math.sin(t),.43+.16*math.cos(t))
    for obj in parts:
        obj.rotation_mode='QUATERNION';obj.rotation_quaternion=base[obj.name]
        obj.location=locations[obj.name]
    if a.variant=='counter':
        # Attached fine rim and violet channel follow the outer ring exactly.
        turn(['Outer smoked chrome orbit','Fine crystal edge','Violet light inside outer glass'],(0,1,0),.35*math.sin(t))
        turn(['Inner glass orbit'],(1,0,0),-.42*math.sin(t))
        turn(['Crossing amethyst orbit'],(0,1,0),-.30*math.sin(t))
    elif a.variant=='phases':
        turn(['Outer smoked chrome orbit','Fine crystal edge','Violet light inside outer glass'],(0,1,0),.22*math.sin(t))
        turn(['Inner glass orbit'],(1,0,0),.30*math.sin(t+.8))
        turn(['Crossing amethyst orbit'],(0,1,0),-.25*math.sin(t+1.6))
        turn(['Sculpted glass helix','Countertwist glass helix'],(0,0,1),.12*math.sin(t+2.4))
        turn(['Faceted luminous heart'],(0,0,1),-.15*math.sin(t))
    elif a.variant=='continuous':
        # Unwrapped angles: real complete turns, not sinusoidal rocking.
        # Parent-space X/Z axes change ring planes; spinning a torus around
        # its own symmetry axis would be visually indistinguishable.
        assembly.rotation_euler=(.24+.10*math.sin(t),.18+t,.43+.10*math.cos(t))
        turn(['Inner glass orbit'],(0,0,1),2*t)
        turn(['Crossing amethyst orbit'],(1,0,0),-t)
        turn(['Faceted luminous heart'],(0,0,1),t)
        heart=bpy.data.objects['Faceted luminous heart']
        heart.location=locations[heart.name]+Vector((.018*math.sin(t),0,.012*math.cos(t)))

# Save editable keyed study separately; public and approved source are intact.
for frame in range(1,a.frames+2):
    pose(frame);assembly.keyframe_insert(data_path='rotation_euler',frame=frame)
    for obj in parts:
        obj.keyframe_insert(data_path='rotation_quaternion',frame=frame)
        obj.keyframe_insert(data_path='location',frame=frame)
pose(1);scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(output/'study.blend'))
for obj in [assembly,*parts]:obj.animation_data_clear()
for frame in range(1,min(a.end or a.frames,a.frames)+1):
    start=time.monotonic();scene.frame_set(frame);pose(frame)
    scene.render.filepath=str(output/f'frame_{frame:04d}.png')
    bpy.ops.render.render(write_still=True)
    if frame%24==0 or frame==1:print('STUDY_FRAME',a.variant,frame,round(time.monotonic()-start,2),flush=True)
(output/'metadata.json').write_text(json.dumps({'variant':a.variant,'width':a.size,'height':a.size,'frames':min(a.end or a.frames,a.frames),'fps':a.fps,'cyclesSamples':a.samples,'source':'art/crystal-flow.blend','persistentData':False},indent=2))
