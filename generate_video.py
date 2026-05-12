import torch
from diffusers import MotifVideoPipeline
from diffusers.utils import export_to_video
import sys

def main():
    if len(sys.argv) < 2:
        print("Error: Please provide a prompt.")
        sys.exit(1)
        
    prompt = sys.argv[1]
    output_filename = "output.mp4"

    print(f"Loading Motif-Video-2B model. This requires 30GB+ VRAM...")
    
    # Initialize the pipeline
    pipe = MotifVideoPipeline.from_pretrained(
        "Motif-Technologies/Motif-Video-2B",
        torch_dtype=torch.bfloat16,
    )
    
    # Move to GPU
    pipe = pipe.to("cuda")

    print(f"Generating video for prompt: {prompt}")

    # Generate the video frames
    output = pipe(
        prompt=prompt,
        negative_prompt="text overlay, graphic overlay, watermark, logo, subtitles, timestamp, broadcast graphics, UI elements, random letters, frozen pose, rigid, static expression, jerky motion, mechanical motion, discontinuous motion, flat framing, depthless, dull lighting, monotone, crushed shadows, blown-out highlights, shifting background, fading background, poor continuity, identity drift, deformation, flickering, ghosting, smearing, duplication, mutated proportions, inconsistent clothing, flat colors, desaturated, tonally compressed, poor background separation, exposure shift, uneven brightness, color balance shift",
        height=736,
        width=1280,
        num_frames=121,
        num_inference_steps=50,
        frame_rate=24,
    )

    # Export frames to mp4
    export_to_video(output.frames[0], output_filename, fps=24)
    print(f"Success! Video saved to {output_filename}")

if __name__ == "__main__":
    main()
