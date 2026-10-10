"""Continuous smoked glass, soft studio reflections and real water lenses.
No pane boundary, emissive paths or strip lights. The material plate stays still.
"""
import argparse, random, sys, json
from pathlib import Path
import bpy
from mathutils import Vector

parser=argparse.ArgumentParser()
parser.add_argument('--width',type=int,default=3840)
parser.add_argument('--samples',type=int,default=96)
parser.add_argument('--output',default='render/crystal/infinity-glass-4k.png')
parser.add_argument('--droplets',type=int,default=36)
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
root=Path(__file__).resolve().parent.parent
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene

def material(name,color,transmission=0,roughness=.08,ior=1.5):
    result=bpy.data.materials.new(name);result.use_nodes=True
    shader=result.node_tree.nodes.get('Principled BSDF')
    for key,value in {'Base Color':(*color,1),'Transmission Weight':transmission,'Roughness':roughness,'IOR':ior}.items():shader.inputs[key].default_value=value
    return result

def aim(obj,point=(0,0,0)):
    obj.rotation_euler=(Vector(point)-obj.location).to_track_quat('-Z','Y').to_euler()

def area(name,position,color,power,width,height,target=(0,0,0)):
    data=bpy.data.lights.new(name,'AREA');data.shape='DISK'
    data.energy,data.color,data.size,data.size_y=power,color,width,height
    obj=bpy.data.objects.new(name,data);scene.collection.objects.link(obj)
    obj.location=position;aim(obj,target)

# Both surfaces extend beyond the camera so the field has no visible boundary.
base=material('Deep graphite substrate',(.017,.013,.024),roughness=.28)
bpy.ops.mesh.primitive_cube_add(size=1,location=(0,.3,0))
o=bpy.context.object;o.name='Unbounded dark substrate';o.scale=(60,.25,42);o.data.materials.append(base)
glass=material('Smoked amethyst optical depth',(.13,.07,.20),.94,.19,1.46)
nodes,links=glass.node_tree.nodes,glass.node_tree.links
noise=nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=.24;noise.inputs['Detail'].default_value=2
tex=nodes.new('ShaderNodeTexCoord');links.new(tex.outputs['Object'],noise.inputs['Vector'])
bump=nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.13;bump.inputs['Distance'].default_value=.045
links.new(noise.outputs['Fac'],bump.inputs['Height']);links.new(bump.outputs['Normal'],nodes.get('Principled BSDF').inputs['Normal'])
bpy.ops.mesh.primitive_cube_add(size=1,location=(0,0,0))
o=bpy.context.object;o.name='Continuous infinity glass plane';o.scale=(54,.15,36);o.data.materials.append(glass)

water=material('Water - IOR 1.333',(.98,.96,1),1,.022,1.333)
random.seed(5070)
for index in range(args.droplets):
    # Side lenses give surface detail while leaving the centre calm for text.
    x=random.choice([-1,1])*random.uniform(8.6,11.7);z=random.uniform(-6.5,6.5);radius=random.uniform(.05,.125)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=40,ring_count=24,radius=1,location=(x,-.12,z))
    drop=bpy.context.object;drop.name=f'Water lens {index+1:02}'
    drop.scale=(radius,radius*.56,radius*random.uniform(1,1.25));drop.rotation_euler[1]=random.uniform(-.3,.3);drop.data.materials.append(water)
    for polygon in drop.data.polygons:polygon.use_smooth=True

# Broad, off-axis softboxes instead of visible luminous lines.
area('Soft lavender key',(-10,-7,9),(.62,.48,1),650,11,9,(-7,0,3))
area('Amethyst depth fill',(12,-5,-2),(.40,.16,1),520,9,11,(8,0,0))
area('Quiet water rim',(-12,-3,-7),(.76,.66,1),180,8,5,(-9,0,-3))
world=bpy.data.worlds.new('Low key violet studio');world.use_nodes=True
world.node_tree.nodes.get('Background').inputs['Color'].default_value=(.023,.017,.031,1)
world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.18;scene.world=world
camera_data=bpy.data.cameras.new('Infinity material camera');camera=bpy.data.objects.new(camera_data.name,camera_data)
scene.collection.objects.link(camera);camera.location=(0,-30,0);aim(camera);camera_data.type,camera_data.ortho_scale='ORTHO',24;scene.camera=camera
scene.render.engine='CYCLES';scene.cycles.samples=args.samples
scene.cycles.max_bounces,scene.cycles.transmission_bounces=16,12;scene.render.use_persistent_data=False;scene.cycles.use_adaptive_sampling=True;scene.cycles.adaptive_threshold=.008
scene.view_layers[0].cycles.use_denoising=True;scene.cycles.denoiser='OPENIMAGEDENOISE';scene.cycles.denoising_use_gpu=True
prefs=bpy.context.preferences.addons['cycles'].preferences;prefs.compute_device_type='OPTIX';prefs.get_devices()
for device in prefs.devices:device.use=device.type=='OPTIX'
scene.cycles.device='GPU';scene.view_settings.view_transform='AgX'
scene.render.resolution_x,scene.render.resolution_y=args.width,round(args.width*9/16);scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGB'
output=root/args.output;output.parent.mkdir(parents=True,exist_ok=True);scene.render.filepath=str(output)
bpy.ops.render.render(write_still=True)
metadata={'width':scene.render.resolution_x,'height':scene.render.resolution_y,'waterLenses':sum(o.name.startswith('Water lens ') for o in bpy.data.objects),'samples':args.samples}
output.with_suffix('.json').write_text(json.dumps(metadata,indent=2))
print('BACKDROP_SOURCE',json.dumps(metadata),flush=True)
