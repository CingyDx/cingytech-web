"""Verify saved study loop closure, angular steps and independent ring motion."""
import bpy, math, json
from pathlib import Path
root=Path(__file__).resolve().parent.parent/'render/crystal/motion-studies'
reports=[]
for variant in ['together','counter','phases']:
    bpy.ops.wm.open_mainfile(filepath=str(root/variant/'study.blend'))
    scene=bpy.context.scene
    objects=[o for o in bpy.data.objects if o.type not in ('LIGHT','CAMERA')]
    scene.frame_set(1);bpy.context.view_layer.update()
    first={o.name:o.matrix_world.to_quaternion() for o in objects}
    local={o.name:o.rotation_quaternion.copy() for o in objects if o.name!='Orbit assembly'}
    previous=first.copy();maximum=0;local_motion={name:0 for name in local}
    for frame in range(2,290):
        scene.frame_set(frame);bpy.context.view_layer.update()
        current={o.name:o.matrix_world.to_quaternion() for o in objects}
        for name,q in current.items():
            angle=q.rotation_difference(previous[name]).angle
            maximum=max(maximum,math.degrees(min(angle,2*math.pi-angle)))
        for name,q in local.items():
            angle=q.rotation_difference(bpy.data.objects[name].rotation_quaternion).angle
            local_motion[name]=max(local_motion[name],min(angle,2*math.pi-angle))
        previous=current
    seam=max(math.degrees(min(q.rotation_difference(first[name]).angle,2*math.pi-q.rotation_difference(first[name]).angle)) for name,q in previous.items())
    moved=[name for name,angle in local_motion.items() if angle>.02]
    if seam>.05 or maximum>3:raise RuntimeError(f'{variant}: discontinuous motion')
    if variant!='together' and len(moved)<3:raise RuntimeError('Expected independently moving rings')
    reports.append({'variant':variant,'loopClosureDegrees':round(seam,5),'maxWorldStepDegrees':round(maximum,5),'independentlyMovingParts':moved})
(root/'motion-audit.json').write_text(json.dumps(reports,indent=2))
print('MOTION_AUDIT',json.dumps(reports))
