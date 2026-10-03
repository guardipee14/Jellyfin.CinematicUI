`fixture.webm` is a 3,308-byte, silent, 60-second solid-color VP9 video generated for browser play/pause and seek tests. It contains no production media and has no external runtime dependency.

Generation command (FFmpeg):

```sh
ffmpeg -f lavfi -i 'color=c=0x214e75:s=160x90:r=2:d=60' -c:v libvpx-vp9 -b:v 10k -an fixture.webm
```

The localhost fixture serves byte ranges so Chromium can seek. The preview poster is separately generated from repository-owned SVG code. Test media, dependencies, and fixtures are excluded from runtime ZIPs.
