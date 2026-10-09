"""Reject missing 4K frames and the reproduced solid-black Cycles cache defect."""
from pathlib import Path
from PIL import Image
import numpy as np

def verify_frames(directory):
    failures=[]
    for index in range(1,361):
        path=directory/f'crystal_{index:04d}.png'
        if not path.is_file():failures.append(f'{index}: missing');continue
        with Image.open(path) as image:
            if image.size!=(3840,2160):failures.append(f'{index}: not 4K')
            pixels=np.array(image.convert('RGBA').resize((384,216)))
        # This transparent, lit glass sculpture has no intentionally opaque
        # black surfaces. The failed renderer produced thousands of such pixels.
        black=int(((pixels[:,:,:3].max(axis=2)<3)&(pixels[:,:,3]>240)).sum())
        if black>100:failures.append(f'{index}: {black} opaque black pixels')
    if failures:raise RuntimeError('Invalid crystal source frames: '+', '.join(failures[:12])+f' ({len(failures)} failing frames)')
    return {'frames':360,'width':3840,'height':2160,'opaqueBlackDefect':False}

if __name__=='__main__':
    print(verify_frames(Path(__file__).resolve().parent.parent/'render/crystal/frames-4k-clean'))
