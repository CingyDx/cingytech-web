"""Actual Cycles materials for the purple-glass site. No raster mockup assets.

Hero retains the existing orbital sculpture; wet-slab is a refractive glass
frame with real 1.333-IOR water droplets and a recessed violet light channel.
"""
import argparse, math, os, sys, time
from pathlib import Path
import bpy
from mathutils import Vector

parser=argparse.ArgumentParser()
parser.add_argument('--asset',choices=['hero','wet-slab'],default='hero')
parser.add_argument('--width',type=int,default=1920)
parser.add_argument('--height',type=int,default=1080)
parser.add_argument('--samples',type=int,default=64)
parser.add_argument('--frames',type=int,default=360)
parser.add_argument('--fps',type=int,default=60)
parser.add_argument('--start',type=int,default=1)
parser.add_argument('--end',type=int,default=1)
parser.add_argument('--output',default='render/crystal/hero')
parser.add_argument('--save-blend',default='')
parser.add_argument('--motion',choices=['studio','flow'],default='studio')
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
project=Path(__file__).resolve().parent.parent

def material(name,color,transmission=0,metallic=0,roughness=.04,ior=1.48,emission=0):
    mat=bpy.data.materials.new(name);mat.use_nodes=True
    p=mat.node_tree.nodes.get('Principled BSDF')
    for key,value in {'Base Color':(*color,1),'Transmission Weight':transmission,'Metallic':metallic,'Roughness':roughness,'IOR':ior,'Emission Color':(*color,1),'Emission Strength':emission}.items():
        p.inputs[key].default_value=value
    return mat

def point_at(obj,target=(0,0,0)):
    obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()

def area(name,pos,color,energy,size,size_y):
    data=bpy.data.lights.new(name,'AREA');data.color=color;data.energy=energy;data.shape='RECTANGLE';data.size=size;data.size_y=size_y
    obj=bpy.data.objects.new(name,data);bpy.context.scene.collection.objects.link(obj);obj.location=pos;point_at(obj)

if args.asset=='hero':
    bpy.ops.wm.open_mainfile(filepath=str(project/'art/hero-glass.blend'))
    root=bpy.data.objects.get('Orbit assembly');root.animation_data_clear()
    # Retain recognizable geometry while making the outer orbit optical glass.
    optical=material('Studio optical amethyst',(.27,.065,.65),.97,.015,.012,1.5)
    for name in ['Outer smoked chrome orbit','Crossing amethyst orbit','Countertwist glass helix']:
        obj=bpy.data.objects.get(name)
        if obj:obj.data.materials.clear();obj.data.materials.append(optical)
    heart=bpy.data.objects.get('Faceted luminous heart')
    heart.data.materials.clear();heart.data.materials.append(material('Translucent violet heart',(.59,.30,1),.88,.03,.035,1.45,.12))
    bpy.ops.mesh.primitive_uv_sphere_add(segments=48,ring_count=24,radius=.11)
    emitter=bpy.context.object;emitter.name='Internal violet light';emitter.parent=root;emitter.data.materials.append(material('Core light',(.30,.03,1),emission=3))
    bpy.ops.mesh.primitive_torus_add(major_segments=192,minor_segments=12,major_radius=1.57,minor_radius=.009)
    channel=bpy.context.object;channel.name='Violet light inside outer glass';channel.parent=root
    channel.rotation_euler=bpy.data.objects['Outer smoked chrome orbit'].rotation_euler
    channel.data.materials.append(material('Sculpture ultraviolet channel',(.38,.009,1),emission=1.9))
    bpy.context.scene.camera.data.ortho_scale=7.0
    for obj in list(bpy.data.objects):
        if obj.type=='LIGHT':bpy.data.objects.remove(obj,do_unlink=True)
    area('Softbox key',(-3.3,-4.0,4.8),(.89,.84,1),750,4.2,1.4)
    area('Violet LED rim',(3.4,1.5,1.8),(.48,.035,1),2000,3.5,.65)
    area('Tall optical strip',(.5,-4.2,2.2),(.97,.94,1),530,.19,4.4)
    area('Cool edge strip',(-3,-1.8,.6),(.62,.73,1),500,.18,3.0)
    area('Lilac underside',(-1.0,-1.3,-3),(.46,.16,1),1100,3.5,.65)
    area('Rear soft reflection',(0,3.2,3),(.74,.60,1),700,3.8,1.3)
else:
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    scene=bpy.context.scene
    glass=material('Smoked lilac optical slab',(.65,.48,.92),.97,.0,.028,1.5)
    rim=material('Polished violet bevel',(.28,.10,.63),.60,.25,.02,1.5)
    led=material('Recessed ultraviolet LED',(.40,.035,1),emission=2.5)
    water=material('Pure water 1.333',(.96,.98,1),1,0,.008,1.333)
    backing=material('Deep purple backing',(.026,.012,.048),0,.32,.18)
    def slab(name,dimensions,location,mat,bevel):
        bpy.ops.mesh.primitive_cube_add(size=1,location=location);obj=bpy.context.object;obj.name=name;obj.dimensions=dimensions;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
        mod=obj.modifiers.new('Optical rounded edge','BEVEL');mod.width=bevel;mod.segments=10
        obj.modifiers.new('Weighted optical normals','WEIGHTED_NORMAL');obj.data.materials.append(mat)
        return obj
    slab('Glass slab',(6.4,.18,1.8),(0,0,0),glass,.12)
    slab('Recessed dark backing',(6.22,.025,1.62),(0,.11,0),backing,.11)
    def outline(name,w,h,r,y,tube,mat):
        points=[]
        for cx,cz,angle in [(w/2-r,h/2-r,0),(-w/2+r,h/2-r,90),(-w/2+r,-h/2+r,180),(w/2-r,-h/2+r,270)]:
            for i in range(20):
                a=math.radians(angle+i*90/19);points.append((cx+r*math.cos(a),y,cz+r*math.sin(a),1))
        curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D';curve.bevel_depth=tube;curve.bevel_resolution=5
        spline=curve.splines.new('POLY');spline.points.add(len(points)-1)
        for p,co in zip(spline.points,points):p.co=co
        spline.use_cyclic_u=True;obj=bpy.data.objects.new(name,curve);scene.collection.objects.link(obj);obj.data.materials.append(mat)
    outline('Outer optical rim',6.42,1.82,.18,-.02,.032,rim)
    outline('Recessed LED channel',6.26,1.66,.16,.02,.010,led)
    # Droplets sit against the lens surface, away from the native label region.
    for index,(x,z,r,stretch) in enumerate([(-2.92,.77,.092,1.14),(-2.67,.79,.034,1),(-2.80,.66,.022,1.1),(2.85,-.68,.063,1.25),(2.99,-.61,.028,1),(2.69,-.76,.021,1.12)]):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=48,ring_count=24,radius=1,location=(x,-.107,z));obj=bpy.context.object;obj.name=f'Water lens {index+1}'
        obj.scale=(r,r*.62,r*stretch);obj.data.materials.append(water)
        for p in obj.data.polygons:p.use_smooth=True
    area('Wide studio strip',(-2,-4,5),(.91,.85,1),800,5.6,.35)
    area('Fine right edge',(3,-2,2.3),(.61,.25,1),900,.18,3)
    area('Lower violet LED bounce',(-1,-2,-3),(.48,.06,1),500,4,.3)
    world=bpy.data.worlds.new('Dark studio');world.use_nodes=True;world.node_tree.nodes.get('Background').inputs['Color'].default_value=(.015,.01,.025,1);world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.14;scene.world=world
    data=bpy.data.cameras.new('Slab camera');camera=bpy.data.objects.new('Slab camera',data);scene.collection.objects.link(camera);camera.location=(0,-10,.32);point_at(camera);data.type='ORTHO';data.ortho_scale=6.76;scene.camera=camera

scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=args.samples
scene.cycles.max_bounces=12;scene.cycles.transmission_bounces=12;scene.cycles.glossy_bounces=6
scene.cycles.use_light_tree=True;scene.cycles.use_adaptive_sampling=True;scene.cycles.adaptive_threshold=.015
scene.render.resolution_x=args.width;scene.render.resolution_y=args.height;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.film_transparent=True
# OptiX persistent scene data reproduced opaque black glass late in this
# rotating sequence. Rebuilding per frame avoids that renderer-cache defect.
scene.render.use_persistent_data=False;scene.render.fps=args.fps;scene.frame_start=1;scene.frame_end=args.frames
scene.view_settings.view_transform='AgX';scene.view_layers[0].cycles.use_denoising=True
scene.cycles.denoiser='OPENIMAGEDENOISE'
scene.cycles.denoising_use_gpu=True
prefs=bpy.context.preferences.addons['cycles'].preferences;prefs.compute_device_type='OPTIX';prefs.get_devices()
for device in prefs.devices:device.use=device.type=='OPTIX'
scene.cycles.device='GPU' if any(d.use for d in prefs.devices) else 'CPU'
print('CRYSTAL_RENDER_DEVICE',[(d.name,d.type,d.use) for d in prefs.devices],flush=True)

def pose(frame):
    if args.asset=='hero':
        a=2*math.pi*(frame-1)/args.frames
        # One smooth revolution, gentle precession; no doubled fast axes.
        root.rotation_euler=(a+.24,.18+.22*math.sin(a),a+.43) if args.motion=='flow' else (.24+.16*math.sin(a),a,.30+.13*math.cos(a))

if args.save_blend:
    if args.asset=='hero':
        for frame in range(1,args.frames+2):pose(frame);root.keyframe_insert(data_path='rotation_euler',frame=frame)
    pose(1);scene.frame_set(1);bpy.ops.wm.save_as_mainfile(filepath=str(project/args.save_blend))
    if args.asset=='hero':root.animation_data_clear()

output=Path(args.output).resolve();output.parent.mkdir(parents=True,exist_ok=True)
for frame in range(args.start,args.end+1):
    started=time.monotonic();scene.frame_set(frame);pose(frame)
    scene.render.filepath=str(output) if args.start==args.end else f'{output}_{frame:04d}.png'
    bpy.ops.render.render(write_still=True)
    print('CRYSTAL_FRAME',frame,'SECONDS',round(time.monotonic()-started,2),flush=True)
