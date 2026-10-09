"""Ray-traced, restrained wet glass light field behind the native interface."""
import bpy, math, random
from pathlib import Path
from mathutils import Vector

root=Path(__file__).resolve().parent.parent
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene
def mat(name,color,transmission=0,roughness=.08,ior=1.5,emit=0):
    m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF')
    for key,value in {'Base Color':(*color,1),'Transmission Weight':transmission,'Roughness':roughness,'IOR':ior,'Emission Color':(*color,1),'Emission Strength':emit}.items():p.inputs[key].default_value=value
    return m
def aim(o,point=(0,0,0)):o.rotation_euler=(Vector(point)-o.location).to_track_quat('-Z','Y').to_euler()
def area(name,pos,color,power,w,h):
    d=bpy.data.lights.new(name,'AREA');d.shape='RECTANGLE';d.energy=power;d.color=color;d.size=w;d.size_y=h
    o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);o.location=pos;aim(o)
base=mat('Obsidian substrate',(.009,.005,.018),roughness=.28)
bpy.ops.mesh.primitive_cube_add(size=1,location=(0,.25,0));o=bpy.context.object;o.name='Deep obsidian glass substrate';o.scale=(24,.2,14);o.data.materials.append(base)
glass=mat('Optical violet front pane',(.14,.02,.32),.96,.035)
bpy.ops.mesh.primitive_cube_add(size=1,location=(0,0,0));o=bpy.context.object;o.name='Thin violet optical pane';o.scale=(23,.12,13);o.data.materials.append(glass)
water=mat('Clear water lenses',(.93,.88,1),1,.015,1.333)
random.seed(5070)
for i in range(19):
    x=random.choice([-1,1])*random.uniform(5.8,10.8);z=random.uniform(-5.7,5.7);r=random.uniform(.045,.13)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=16,radius=1,location=(x,-.13,z));o=bpy.context.object;o.name=f'Background water lens {i+1}';o.scale=(r,.085,r*random.uniform(1,1.3));o.data.materials.append(water)
    for p in o.data.polygons:p.use_smooth=True
led=mat('Violet optical filaments',(.22,.01,.65),emit=2.1)
paths=[[(-12,4.6),(-7.2,3.2),(-3.8,3.9),(3.6,2.8),(8.1,3.8),(12,2.3)], [(-12,-2.5),(-7.5,-3.3),(-4.5,-2.7),(4.0,-4.6),(8.6,-3.4),(12,-4.2)]]
for i,points in enumerate(paths):
    c=bpy.data.curves.new(f'Light path {i+1}','CURVE');c.dimensions='3D';c.bevel_depth=.008;c.bevel_resolution=4
    s=c.splines.new('BEZIER');s.bezier_points.add(len(points)-1)
    for b,(x,z) in zip(s.bezier_points,points):b.co=(x,.12,z);b.handle_left_type='AUTO';b.handle_right_type='AUTO'
    o=bpy.data.objects.new(c.name,c);scene.collection.objects.link(o);o.data.materials.append(led)
area('Upper optical reflection',(-7,-4,8),(.68,.32,1),1000,12,.12)
area('Violet side bounce',(10,-2,0),(.31,.01,1),1600,.2,8)
area('Lower lilac seam',(-4,-3,-6),(.46,.12,1),600,13,.15)
world=bpy.data.worlds.new('Quiet violet studio');world.use_nodes=True;world.node_tree.nodes.get('Background').inputs['Color'].default_value=(.009,.004,.019,1);world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.15;scene.world=world
d=bpy.data.cameras.new('Backdrop camera');o=bpy.data.objects.new(d.name,d);scene.collection.objects.link(o);o.location=(0,-30,0);aim(o);d.type='ORTHO';d.ortho_scale=24;scene.camera=o
scene.render.engine='CYCLES';scene.cycles.samples=64;scene.cycles.max_bounces=16;scene.cycles.transmission_bounces=12;scene.cycles.use_adaptive_sampling=True
scene.view_layers[0].cycles.use_denoising=True;scene.cycles.denoiser='OPENIMAGEDENOISE';scene.cycles.denoising_use_gpu=True
prefs=bpy.context.preferences.addons['cycles'].preferences;prefs.compute_device_type='OPTIX';prefs.get_devices()
for dev in prefs.devices:dev.use=dev.type=='OPTIX'
scene.cycles.device='GPU'
scene.view_settings.view_transform='AgX';scene.render.resolution_x=3840;scene.render.resolution_y=2160;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGB'
output=root/'render/crystal/optical-backdrop-4k.png';output.parent.mkdir(parents=True,exist_ok=True);scene.render.filepath=str(output)
bpy.ops.render.render(write_still=True)
