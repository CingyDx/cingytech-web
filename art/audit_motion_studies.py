"""Verify saved study loop closure, angular steps and independent ring motion."""
import bpy, math, json, sys
from pathlib import Path
root=Path(__file__).resolve().parent.parent/'render/crystal/motion-studies'
reports=[]
variants=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else ['together','counter','phases']
for variant in variants:
    bpy.ops.wm.open_mainfile(filepath=str(root/variant/'study.blend'))
    scene=bpy.context.scene
    objects=[o for o in bpy.data.objects if o.type not in ('LIGHT','CAMERA')]
    scene.frame_set(1);bpy.context.view_layer.update()
    first={o.name:o.matrix_world.to_quaternion() for o in objects}
    local={o.name:o.rotation_quaternion.copy() for o in objects if o.name!='Orbit assembly'}
    previous=first.copy();maximum=0;local_motion={name:0 for name in local};local_travel={name:0 for name in local};previous_local={name:q.copy() for name,q in local.items()}
    first_root_y=bpy.data.objects['Orbit assembly'].rotation_euler.y
    for frame in range(2,scene.frame_end+2):
        scene.frame_set(frame);bpy.context.view_layer.update()
        current={o.name:o.matrix_world.to_quaternion() for o in objects}
        for name,q in current.items():
            angle=q.rotation_difference(previous[name]).angle
            maximum=max(maximum,math.degrees(min(angle,2*math.pi-angle)))
        for name,q in local.items():
            current_local=bpy.data.objects[name].rotation_quaternion.copy()
            angle=q.rotation_difference(current_local).angle
            local_motion[name]=max(local_motion[name],min(angle,2*math.pi-angle))
            step=previous_local[name].rotation_difference(current_local).angle
            local_travel[name]+=math.degrees(min(step,2*math.pi-step));previous_local[name]=current_local
        previous=current
    seam=max(math.degrees(min(q.rotation_difference(first[name]).angle,2*math.pi-q.rotation_difference(first[name]).angle)) for name,q in previous.items())
    moved=[name for name,angle in local_motion.items() if angle>.02]
    if seam>.05 or maximum>3:raise RuntimeError(f'{variant}: discontinuous motion')
    if variant!='together' and len(moved)<3:raise RuntimeError('Expected independently moving rings')
    root_turn=math.degrees(bpy.data.objects['Orbit assembly'].rotation_euler.y-first_root_y)
    if variant=='continuous':
        if abs(root_turn-360)>.05 or local_travel['Inner glass orbit']<719 or local_travel['Crossing amethyst orbit']<359:raise RuntimeError('Expected real continuous complete rotations')
    reports.append({'variant':variant,'loopClosureDegrees':round(seam,5),'maxWorldStepDegrees':round(maximum,5),'independentlyMovingParts':moved,'rootUnwrappedYDegrees':round(root_turn,4),'relativeAngularTravelDegrees':{name:round(angle,3) for name,angle in local_travel.items() if angle>1}})
(root/(f'motion-audit-{variants[0]}.json' if len(variants)==1 else 'motion-audit.json')).write_text(json.dumps(reports,indent=2))
print('MOTION_AUDIT',json.dumps(reports))
