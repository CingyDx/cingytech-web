# Cingy.Tech glass hero

`hero-glass.blend` is the editable Blender 5.2 Cycles scene. It contains a 120-frame rotation at 24 fps. `hero-master-4k.png` is a 3840 × 2160 Cycles master still. The website serves WebP posters and responsive H.264 video variants from `public/assets/`; the transparent VP9 variants and true 3840 × 2160 source loop remain available.

The source generator is `render_glass_hero.py`. It builds the glass geometry, physically based materials, studio lights, camera, and a transparent frame sequence. Blender CUDA rendering was used for the shipped source frames; CPU rendering works as a fallback.

To regenerate the editable scene and 4K master still:

```sh
blender -b -t 0 --python art/render_glass_hero.py -- --width 3840 --height 2160 --samples 96 --start 16 --end 16 --save-blend art/hero-glass.blend --output art/hero-master-4k.png
```

To render the five-second loop from the project root:

```sh
blender -b -t 0 --python art/render_glass_hero.py -- --width 3840 --height 2160 --samples 24 --start 1 --end 120 --output render/frames4k/glass
```

The frame sequence is generated in `render/`, which is ignored by Git. The site includes a still poster for reduced-motion preferences, browsers that cannot play the video, and loading states.

On Windows, run `pwsh -File art/encode_hero.ps1` after all 120 frames exist to regenerate the three VP9 variants. FFmpeg must be available on `PATH`.

Then run `pwsh -File art/encode_compatible_hero.ps1` to precompose the 1920px Blender loop onto the exact page background (#090a10) and export H.264/yuv420p/faststart variants: 960×540 (1.42 MB), 1440×810 (2.90 MB), and 1920×1080 (4.56 MB). They have no audio and retain the original 24fps five-second animation. The player selects one variant by viewport width and waits for an actual presented frame before hiding the poster. These compressed web variants are not 4K.

H.264 avoids the transparent-VP9 issue in WebKit ([issue 275908](https://bugs.webkit.org/show_bug.cgi?id=275908)); Safari is no longer deliberately excluded from playback. Autoplay still depends on browser policy. Reduced motion, data saving, failed playback, and unavailable codecs retain the static poster and manual motion control.
