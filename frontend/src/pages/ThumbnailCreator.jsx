import { useState } from 'react'
import { useHistory } from '../App.jsx'
import { useToast } from '../Toast.jsx'
import UploadBox from '../UploadBox.jsx'

// Locked pending further rollout — see the "AI Provider" card and "Image
// Quality" row below for where these are enforced in the UI.
const GEMINI_LOCKED = true
const HIGH_QUALITY_LOCKED = true

// ── Brand presets ────────────────────────────────────────────
// Each preset has a SEPARATE prompt per provider, on purpose:
// - `gemini` is heavily scaffolded to work around Nano Banana's specific
//   failure modes (flat pasting, wrong product angle, cartoon backgrounds).
// - `openai` is the original brief as written/tested for ChatGPT/GPT Image 2
//   — sent through unmodified, since that model already follows it well and
//   piling Gemini-specific guardrails on top would just be noise.
// The "{{HEADLINE}}" token gets swapped for whatever the user typed in the
// Headline field when the preset is applied, using whichever provider is
// currently selected.
const PRESETS = [
  {
    id: 'lenovo-sp',
    brand: 'Lenovo-SP',
    templates: {
      gemini: `Re-render this as ONE newly photographed image — not a cutout pasted onto a background. Vertical, 1080x1440px.
Subject identity lock: keep the talent's face, pose, expression, and the product's EXACT shape, branding, and — critically — its exact camera angle/side/view from the Base Photo. If the Base Photo shows the back of the device, the output must also show the back of the device; never invent a front view, a screen/display image, or any surface not visible in the original photo. Natural skin texture, no plastic/AI-face look.
Relight the subject from scratch (lighting/shadow/color-grade only — never the object's shape, pose, or visible side): warm, bright studio key light from the upper-left, soft fill light, soft natural shadow cast onto the surface/floor beneath them, so they look physically standing/sitting in the new scene (not floating on top of it).
Grounding surface: place the subject on a clearly visible, photographically real surface (e.g. a light wood or pale desk/tabletop) with a soft, correctly-angled contact shadow directly beneath them — never leave them floating in front of an abstract backdrop with no ground plane.
New background: do NOT reuse the Background Photo's flat illustrated/clip-art look directly, and do NOT render its colorful shapes as flat, hard-edged, vector/sticker graphics. Instead, build a real, softly-blurred lifestyle studio backdrop using its color palette (read the dominant colors from the Background Photo and reuse them as gradient/lighting colors) rendered as genuine photographic bokeh — softly out of focus, feathered edges, natural light falloff, as if captured by a real camera lens, never a crisp cartoon outline. Fill the scene generously — do not leave large areas of empty space. Include 5-7 real-world props spread across foreground, midground and background (e.g. stacked notebooks, a small potted plant, pens/pencils in a holder, sticky notes, headphones, a mug, a phone) so the frame reads as a richly styled, busy desk/lifestyle scene, not a product floating alone.
Integration check: the subject's edge lighting, shadow direction, and color temperature must match the new background exactly, and the whole image (subject, props, background) must share one consistent light source and color grade — if it looks like two separate photos stacked together, redo it.
Headline text: place "{{HEADLINE}}" across the top third of the image, split across 2-3 stacked lines. Large, bold, rounded sans-serif (TikTok/Shorts thumbnail style). Thick white stroke outline (~10px) and soft dark drop shadow on every line for a slight 3D pop. Color the first line white, the second line bright yellow, and the final/most important word in vibrant pink or magenta.
Final look: premium commercial photography quality, sharp focus, energetic and youthful mood, clean spacing, readable in under 1 second on mobile.`,
      openai: `You are a professional advertising designer creating a premium TikTok thumbnail.
INPUTS: Cover photo product + Background reference image (replace the product's background with the background reference image)
Headline text OBJECTIVE: Transform the cover photo into a premium, high-CTR TikTok thumbnail while maintaining a consistent visual identity across all content.
OUTPUT SIZE: 1080 x 1440 px Vertical format TikTok optimized
BACKGROUND: Use the uploaded background reference, replace the product's current background with the uploaded background reference and make it natural.
Maintain: Overall color palette, Gradient direction, Lighting, atmosphere, Visual mood
Background characteristics: Create a natural look with a "Colorful Days" themed background, ensuring the talent's face is clear and bright; add a raised, colorful effect beside or in front of the talent without obscuring them.
Add: Subtle depth of field Light bokeh particles Soft ambient glow
SUBJECT TREATMENT: Keep the product and subject recognizable, make it stand out and the focus point. Keep the original person recognizable.
IMPORTANT: Preserve facial and product identity. Preserve facial identity, Natural skin texture, Realistic photography look, No AI-generated face appearance, No excessive beauty filter, No plastic skin, No exaggerated facial features, No cartoon effect,  No cartoon effect
Enhance: Natural lighting Product visibility Sharpness Contrast Product
HEADLINE: {{HEADLINE}}
TYPOGRAPHY: Premium viral Indonesian social media typography.
Large bold rounded sans-serif font, similar to TikTok and YouTube Shorts thumbnails.
Friendly, youthful, highly readable on mobile screens.
Mixed font weights:
- Main keywords ultra bold
- Supporting words medium weight
Text layout optimized for fast scanning within 1 second.
Thick white stroke outline (8-12px)
Soft dark drop shadow
Slight 3D depth
High contrast against background
Important keywords highlighted using bright accent colors.
Typography should feel:
- modern
- casual
- relatable
- energetic
- social-media native
Text spacing balanced and professional.
Indonesian viral content style.
CTR-optimized thumbnail typography.
Premium advertising quality.
Visual hierarchy: Headline Subject Product Background
Maintain clear spacing. Avoid clutter. Keep the layout balanced. Ensure readability on mobile screens.
LIGHTING: Commercial advertising photography. Use: Soft premium highlights Natural shadows Bright educational mood, casual and youthful energy
QUALITY: Ultra realistic Commercial photography Premium advertising quality Sharp focus 1080x1440`,
    },
  },
  {
    id: 'lenovo-p',
    brand: 'Lenovo-P',
    templates: {
      gemini: `Re-render this as ONE newly photographed image — not a cutout pasted onto a background. Vertical, 1080x1440px. No people in frame.
Subject identity lock: keep the product's EXACT shape, packaging, color, branding, and — critically — its exact camera angle/side/view from the Base Photo unaltered. If the Base Photo shows the back of the device, the output must also show the back of the device; never invent a front view, a screen/display image, or any surface not visible in the original photo.
Relight the product from scratch (lighting/shadow/color-grade only — never the object's shape or visible side): warm, bright studio key light from the upper-left, soft fill light, soft natural shadow cast onto the surface beneath it, so it looks physically placed in the new scene (not floating on top of it).
Grounding surface: place the product on a clearly visible, photographically real surface (e.g. a light wood or pale desk/tabletop) with a soft, correctly-angled contact shadow directly beneath it — never leave it floating in front of an abstract backdrop with no ground plane.
New background: do NOT reuse the Background Photo's flat illustrated/clip-art look directly, and do NOT render its colorful shapes as flat, hard-edged, vector/sticker graphics. Instead, build a real, softly-blurred lifestyle studio backdrop using its color palette (read the dominant colors from the Background Photo and reuse them as gradient/lighting colors) rendered as genuine photographic bokeh — softly out of focus, feathered edges, natural light falloff, as if captured by a real camera lens, never a crisp cartoon outline. Fill the scene generously — do not leave large areas of empty space. Include 5-7 real-world props spread across foreground, midground and background (e.g. stacked notebooks, a small potted plant, pens/pencils in a holder, sticky notes, headphones, a mug, a phone) so the frame reads as a richly styled, busy desk/lifestyle scene, not a product floating alone.
Integration check: the product's edge lighting, shadow direction, and color temperature must match the new background exactly, and the whole image (product, props, background) must share one consistent light source and color grade — if it looks like two separate photos stacked together, redo it.
Headline text: place "{{HEADLINE}}" across the top third of the image, split across 2-3 stacked lines. Large, bold, rounded sans-serif (TikTok/Shorts thumbnail style). Thick white stroke outline (~10px) and soft dark drop shadow on every line for a slight 3D pop. Color the first line white, the second line bright yellow, and the final/most important word in vibrant pink or magenta.
Final look: premium commercial photography quality, sharp focus, energetic and youthful mood, clean spacing, readable in under 1 second on mobile.`,
      openai: `You are a professional advertising designer creating a premium TikTok thumbnail.
INPUTS: Product photo + Background reference image (replace the product's background with the background reference image)
OBJECTIVE: Transform the product photo into a premium, high-CTR TikTok thumbnail while maintaining a consistent visual identity across all content.
OUTPUT SIZE: 1080 x 1440 px Vertical format TikTok optimized
BACKGROUND: Use the uploaded background reference, replace the product's current background with the uploaded background reference and make it natural.
Maintain: Overall color palette, Gradient direction, Lighting, atmosphere, Visual mood
Background characteristics: Create a natural look with a "Colorful Days" themed background; add a raised, colorful effect beside or behind the product without obscuring any part of it.
Add: Subtle depth of field Light bokeh particles Soft ambient glow
SUBJECT TREATMENT: The product is the sole subject and absolute focus point of the image. Do NOT include any people, talent, hands, or human presence anywhere in the frame — product only. Keep the product recognizable and standing out as the hero of the shot.
IMPORTANT: Preserve product identity exactly. Preserve the product's exact shape, packaging, color, branding and markings, Realistic photography look, No AI-generated distortion, No cartoon effect, No invented or altered product details.
Enhance: Natural lighting Product visibility Sharpness Contrast
HEADLINE: {{HEADLINE}}
TYPOGRAPHY: Premium viral Indonesian social media typography.
Large bold rounded sans-serif font, similar to TikTok and YouTube Shorts thumbnails.
Friendly, youthful, highly readable on mobile screens.
Mixed font weights:
- Main keywords ultra bold
- Supporting words medium weight
Text layout optimized for fast scanning within 1 second.
Thick white stroke outline (8-12px)
Soft dark drop shadow
Slight 3D depth
High contrast against background
Important keywords highlighted using bright accent colors.
Typography should feel:
- modern
- casual
- relatable
- energetic
- social-media native
Text spacing balanced and professional.
Indonesian viral content style.
CTR-optimized thumbnail typography.
Premium advertising quality.
Visual hierarchy: Headline Product Background
Maintain clear spacing. Avoid clutter. Keep the layout balanced. Ensure readability on mobile screens.
LIGHTING: Commercial advertising photography. Use: Soft premium highlights Natural shadows Bright educational mood, casual and youthful energy
QUALITY: Ultra realistic Commercial photography Premium advertising quality Sharp focus 1080x1440`,
    },
  },
  // ── Universal presets ──────────────────────────────────────
  // Not tied to a specific brand — pick by WHAT'S in the photo (talent only,
  // product only, or both), for any campaign theme. Unlike the Lenovo presets
  // above, these don't have a separately-engineered Gemini scaffold yet — the
  // same brief is used for both providers below. If Gemini gets unlocked and
  // these need Nano-Banana-specific guardrails, split `gemini` out like the
  // Lenovo presets do.
  {
    id: 'universal-s',
    brand: 'Universal-S',
    templates: {
      gemini: `You are a professional advertising designer creating a premium TikTok thumbnail.
INPUTS: Cover photo subject + Background reference image (replace the subject's background with the background reference image)
Headline text OBJECTIVE: Transform the cover photo into a premium, high-CTR TikTok thumbnail while maintaining a consistent visual identity across all content.
OUTPUT SIZE: 1080 x 1440 px Vertical format TikTok optimized
BACKGROUND: Use the uploaded background reference, replace the subject's current background with the uploaded background reference and make it natural.
Maintain: Overall color palette, Gradient direction, Lighting, atmosphere, Visual mood
Background characteristics: Create a natural look ensuring the talent's face is clear and bright.
Add: Subtle depth of field Light bokeh particles Soft ambient glow
SUBJECT TREATMENT: Keep the subject recognizable, make it stand out and the focus point. Keep the original person recognizable.
IMPORTANT: Preserve facial identity, Natural skin texture, Realistic photography look, No AI-generated face appearance, No excessive beauty filter, No plastic skin, No exaggerated facial features, No cartoon effect,  No cartoon effect
Enhance: Natural lighting Subject visibility Sharpness Contrast Product
HEADLINE: {{HEADLINE}}
TYPOGRAPHY: Premium viral Indonesian social media typography.
Large bold rounded sans-serif font, similar to TikTok and YouTube Shorts thumbnails.
Friendly, youthful, highly readable on mobile screens.
Mixed font weights:
- Main keywords ultra bold
- Supporting words medium weight
Text layout optimized for fast scanning within 1 second.
Thick white stroke outline (8-12px)
Soft dark drop shadow
Slight 3D depth
High contrast against background
Important keywords highlighted using bright accent colors.
Typography should feel:
- modern
- casual
- relatable
- energetic
- social-media native
Text spacing balanced and professional.
Indonesian viral content style.
CTR-optimized thumbnail typography.
Premium advertising quality.
Visual hierarchy: Subject Headline Background
Maintain clear spacing. Avoid clutter. Keep the layout balanced. Ensure readability on mobile screens.
LIGHTING: Commercial advertising photography. Use: Soft premium highlights Natural shadows Bright educational mood, casual and youthful energy
QUALITY: Ultra realistic Commercial photography Premium advertising quality Sharp focus 1080x1440`,
      openai: `You are a professional advertising designer creating a premium TikTok thumbnail.
INPUTS: Cover photo subject + Background reference image (replace the subject's background with the background reference image)
Headline text OBJECTIVE: Transform the cover photo into a premium, high-CTR TikTok thumbnail while maintaining a consistent visual identity across all content.
OUTPUT SIZE: 1080 x 1440 px Vertical format TikTok optimized
BACKGROUND: Use the uploaded background reference, replace the subject's current background with the uploaded background reference and make it natural.
Maintain: Overall color palette, Gradient direction, Lighting, atmosphere, Visual mood
Background characteristics: Create a natural look ensuring the talent's face is clear and bright.
Add: Subtle depth of field Light bokeh particles Soft ambient glow
SUBJECT TREATMENT: Keep the subject recognizable, make it stand out and the focus point. Keep the original person recognizable.
IMPORTANT: Preserve facial identity, Natural skin texture, Realistic photography look, No AI-generated face appearance, No excessive beauty filter, No plastic skin, No exaggerated facial features, No cartoon effect,  No cartoon effect
Enhance: Natural lighting Subject visibility Sharpness Contrast Product
HEADLINE: {{HEADLINE}}
TYPOGRAPHY: Premium viral Indonesian social media typography.
Large bold rounded sans-serif font, similar to TikTok and YouTube Shorts thumbnails.
Friendly, youthful, highly readable on mobile screens.
Mixed font weights:
- Main keywords ultra bold
- Supporting words medium weight
Text layout optimized for fast scanning within 1 second.
Thick white stroke outline (8-12px)
Soft dark drop shadow
Slight 3D depth
High contrast against background
Important keywords highlighted using bright accent colors.
Typography should feel:
- modern
- casual
- relatable
- energetic
- social-media native
Text spacing balanced and professional.
Indonesian viral content style.
CTR-optimized thumbnail typography.
Premium advertising quality.
Visual hierarchy: Subject Headline Background
Maintain clear spacing. Avoid clutter. Keep the layout balanced. Ensure readability on mobile screens.
LIGHTING: Commercial advertising photography. Use: Soft premium highlights Natural shadows Bright educational mood, casual and youthful energy
QUALITY: Ultra realistic Commercial photography Premium advertising quality Sharp focus 1080x1440`,
    },
  },
  {
    id: 'universal-p',
    brand: 'Universal-P',
    templates: {
      gemini: `You are a professional advertising designer creating a premium TikTok thumbnail.
INPUTS: Cover photo product + Background reference image (replace the product's background with the background reference image)
Headline text OBJECTIVE: Transform the cover photo into a premium, high-CTR TikTok thumbnail while maintaining a consistent visual identity across all content.
OUTPUT SIZE: 1080 x 1440 px Vertical format TikTok optimized
BACKGROUND: Use the uploaded background reference, replace the product's current background with the uploaded background reference and make it natural.
Maintain: Overall color palette, Gradient direction, Lighting, atmosphere, Visual mood
Background characteristics: Create a natural look; add a raised, colorful effect beside or behind the product without obscuring any part of it.
Add: Subtle depth of field Light bokeh particles Soft ambient glow
SUBJECT TREATMENT: The product is the sole subject and absolute focus point of the image. Do NOT include any people, talent, hands, or human presence anywhere in the frame — product only. Keep the product recognizable and standing out as the hero of the shot.
IMPORTANT: Preserve product identity exactly. Preserve the product's exact shape, packaging, color, branding and markings. Realistic photography look, No AI-generated distortion, No cartoon effect, No invented or altered product details.
Enhance: Natural lighting Product visibility Sharpness Contrast
HEADLINE: {{HEADLINE}}
TYPOGRAPHY: Premium viral Indonesian social media typography.
Large bold rounded sans-serif font, similar to TikTok and YouTube Shorts thumbnails.
Friendly, youthful, highly readable on mobile screens.
Mixed font weights:
- Main keywords ultra bold
- Supporting words medium weight
Text layout optimized for fast scanning within 1 second.
Thick white stroke outline (8-12px)
Soft dark drop shadow
Slight 3D depth
High contrast against background
Important keywords highlighted using bright accent colors.
Typography should feel:
- modern
- casual
- relatable
- energetic
- social-media native
Text spacing balanced and professional.
Indonesian viral content style.
CTR-optimized thumbnail typography.
Premium advertising quality.
Visual hierarchy: Product Headline Background
Maintain clear spacing. Avoid clutter. Keep the layout balanced. Ensure readability on mobile screens.
LIGHTING: Commercial advertising photography. Use: Soft premium highlights Natural shadows Bright educational mood, casual and youthful energy
QUALITY: Ultra realistic Commercial photography Premium advertising quality Sharp focus 1080x1440`,
      openai: `You are a professional advertising designer creating a premium TikTok thumbnail.
INPUTS: Cover photo product + Background reference image (replace the product's background with the background reference image)
Headline text OBJECTIVE: Transform the cover photo into a premium, high-CTR TikTok thumbnail while maintaining a consistent visual identity across all content.
OUTPUT SIZE: 1080 x 1440 px Vertical format TikTok optimized
BACKGROUND: Use the uploaded background reference, replace the product's current background with the uploaded background reference and make it natural.
Maintain: Overall color palette, Gradient direction, Lighting, atmosphere, Visual mood
Background characteristics: Create a natural look; add a raised, colorful effect beside or behind the product without obscuring any part of it.
Add: Subtle depth of field Light bokeh particles Soft ambient glow
SUBJECT TREATMENT: The product is the sole subject and absolute focus point of the image. Do NOT include any people, talent, hands, or human presence anywhere in the frame — product only. Keep the product recognizable and standing out as the hero of the shot.
IMPORTANT: Preserve product identity exactly. Preserve the product's exact shape, packaging, color, branding and markings. Realistic photography look, No AI-generated distortion, No cartoon effect, No invented or altered product details.
Enhance: Natural lighting Product visibility Sharpness Contrast
HEADLINE: {{HEADLINE}}
TYPOGRAPHY: Premium viral Indonesian social media typography.
Large bold rounded sans-serif font, similar to TikTok and YouTube Shorts thumbnails.
Friendly, youthful, highly readable on mobile screens.
Mixed font weights:
- Main keywords ultra bold
- Supporting words medium weight
Text layout optimized for fast scanning within 1 second.
Thick white stroke outline (8-12px)
Soft dark drop shadow
Slight 3D depth
High contrast against background
Important keywords highlighted using bright accent colors.
Typography should feel:
- modern
- casual
- relatable
- energetic
- social-media native
Text spacing balanced and professional.
Indonesian viral content style.
CTR-optimized thumbnail typography.
Premium advertising quality.
Visual hierarchy: Product Headline Background
Maintain clear spacing. Avoid clutter. Keep the layout balanced. Ensure readability on mobile screens.
LIGHTING: Commercial advertising photography. Use: Soft premium highlights Natural shadows Bright educational mood, casual and youthful energy
QUALITY: Ultra realistic Commercial photography Premium advertising quality Sharp focus 1080x1440`,
    },
  },
  {
    id: 'universal-sp',
    brand: 'Universal-SP',
    templates: {
      gemini: `You are a professional advertising designer creating a premium TikTok thumbnail.
INPUTS: Cover photo subject + product + Background reference image (replace the background with the background reference image)
Headline text OBJECTIVE: Transform the cover photo into a premium, high-CTR TikTok thumbnail while maintaining a consistent visual identity across all content.
OUTPUT SIZE: 1080 x 1440 px Vertical format TikTok optimized
BACKGROUND: Use the uploaded background reference, replace the current background with the uploaded background reference and make it natural.
Maintain: Overall color palette, Gradient direction, Lighting, atmosphere, Visual mood
Background characteristics: Create a natural look ensuring the talent's face is clear and bright.
Add: Subtle depth of field Light bokeh particles Soft ambient glow
SUBJECT TREATMENT: Keep both the subject/talent and the product recognizable, make them stand out together as the focus point. Keep the original person and the product recognizable.
IMPORTANT: Preserve facial and product identity. Preserve facial identity, Natural skin texture, Realistic photography look, No AI-generated face appearance, No excessive beauty filter, No plastic skin, No exaggerated facial features, No cartoon effect. Preserve the product's exact shape, packaging, color, branding and markings — no invented or altered product details.
Enhance: Natural lighting Subject visibility Product visibility Sharpness Contrast
HEADLINE: {{HEADLINE}}
TYPOGRAPHY: Premium viral Indonesian social media typography.
Large bold rounded sans-serif font, similar to TikTok and YouTube Shorts thumbnails.
Friendly, youthful, highly readable on mobile screens.
Mixed font weights:
- Main keywords ultra bold
- Supporting words medium weight
Text layout optimized for fast scanning within 1 second.
Thick white stroke outline (8-12px)
Soft dark drop shadow
Slight 3D depth
High contrast against background
Important keywords highlighted using bright accent colors.
Typography should feel:
- modern
- casual
- relatable
- energetic
- social-media native
Text spacing balanced and professional.
Indonesian viral content style.
CTR-optimized thumbnail typography.
Premium advertising quality.
Visual hierarchy: Subject Product Headline Background
Maintain clear spacing. Avoid clutter. Keep the layout balanced. Ensure readability on mobile screens.
LIGHTING: Commercial advertising photography. Use: Soft premium highlights Natural shadows Bright educational mood, casual and youthful energy
QUALITY: Ultra realistic Commercial photography Premium advertising quality Sharp focus 1080x1440`,
      openai: `You are a professional advertising designer creating a premium TikTok thumbnail.
INPUTS: Cover photo subject + product + Background reference image (replace the background with the background reference image)
Headline text OBJECTIVE: Transform the cover photo into a premium, high-CTR TikTok thumbnail while maintaining a consistent visual identity across all content.
OUTPUT SIZE: 1080 x 1440 px Vertical format TikTok optimized
BACKGROUND: Use the uploaded background reference, replace the current background with the uploaded background reference and make it natural.
Maintain: Overall color palette, Gradient direction, Lighting, atmosphere, Visual mood
Background characteristics: Create a natural look ensuring the talent's face is clear and bright.
Add: Subtle depth of field Light bokeh particles Soft ambient glow
SUBJECT TREATMENT: Keep both the subject/talent and the product recognizable, make them stand out together as the focus point. Keep the original person and the product recognizable.
IMPORTANT: Preserve facial and product identity. Preserve facial identity, Natural skin texture, Realistic photography look, No AI-generated face appearance, No excessive beauty filter, No plastic skin, No exaggerated facial features, No cartoon effect. Preserve the product's exact shape, packaging, color, branding and markings — no invented or altered product details.
Enhance: Natural lighting Subject visibility Product visibility Sharpness Contrast
HEADLINE: {{HEADLINE}}
TYPOGRAPHY: Premium viral Indonesian social media typography.
Large bold rounded sans-serif font, similar to TikTok and YouTube Shorts thumbnails.
Friendly, youthful, highly readable on mobile screens.
Mixed font weights:
- Main keywords ultra bold
- Supporting words medium weight
Text layout optimized for fast scanning within 1 second.
Thick white stroke outline (8-12px)
Soft dark drop shadow
Slight 3D depth
High contrast against background
Important keywords highlighted using bright accent colors.
Typography should feel:
- modern
- casual
- relatable
- energetic
- social-media native
Text spacing balanced and professional.
Indonesian viral content style.
CTR-optimized thumbnail typography.
Premium advertising quality.
Visual hierarchy: Subject Product Headline Background
Maintain clear spacing. Avoid clutter. Keep the layout balanced. Ensure readability on mobile screens.
LIGHTING: Commercial advertising photography. Use: Soft premium highlights Natural shadows Bright educational mood, casual and youthful energy
QUALITY: Ultra realistic Commercial photography Premium advertising quality Sharp focus 1080x1440`,
    },
  },
  // ── LEGO Indonesia presets ─────────────────────────────────
  // Same talent/product split as the Universal presets above, but locked to
  // LEGO Indonesia's brand system (brick colors, yellow/red/yellow banner
  // stack, toy-commercial lighting). LEGO-P is the brief as given; LEGO-S
  // and LEGO-SP are derived from it the same way Lenovo-P/Universal-P were
  // derived from their SP counterparts. Same provider-sharing note as
  // Universal: no separately-tuned Gemini scaffold yet.
  {
    id: 'lego-s',
    brand: 'LEGO-S',
    templates: {
      gemini: `You are a professional advertising designer creating a premium TikTok thumbnail for LEGO Indonesia.
INPUTS: Cover photo (talent/subject) + Background reference image
Headline text OBJECTIVE: Transform the cover photo into a premium, high-CTR TikTok thumbnail while maintaining a consistent LEGO Indonesia visual identity across all content.
OUTPUT SIZE: 1080 x 1440 px Vertical format TikTok optimized
BACKGROUND: Use the uploaded background reference as the primary visual environment.
Maintain: Overall color palette, Gradient direction, Lighting atmosphere, Visual mood. DO NOT ADD THE LEGO ICON/LOGO.
Background characteristics: Bright and cheerful, Premium and modern, Soft dreamy gradient, Clean composition, Family-friendly atmosphere, Minimal clutter
Add: Floating LEGO bricks in red, yellow, blue, and green, Soft cloud elements if applicable, Subtle depth of field, Light bokeh particles, Soft ambient glow
SUBJECT TREATMENT: Keep the original person/talent recognizable.
IMPORTANT: Preserve facial identity, Natural skin texture, Realistic photography look, No AI-generated face appearance, No excessive beauty filter, No plastic skin, No exaggerated facial features, No cartoon effect
Enhance: Natural lighting, Subject visibility, Sharpness, Contrast, Subject separation from background
HEADLINE: {{HEADLINE}}
TYPOGRAPHY: Large bold rounded display font.
Style: LEGO-inspired, White text, Thick black outline, Strong shadow, High readability, Mobile-first design, Premium 3D effect
TITLE BANNER SYSTEM: Always use the same LEGO Indonesia banner design: Top Banner: LEGO Yellow (#FFD500), Red text. Middle Banner: LEGO Red (#D01012), White text. Bottom Banner: LEGO Yellow (#FFD500), Black text. Banner Style: Rounded corners, Glossy finish, Slight 3D extrusion, Soft highlights, Consistent positioning
COMPOSITION: Visual hierarchy: Headline Face Background. Maintain clear spacing. Avoid clutter. Keep the layout balanced. Ensure readability on mobile screens.
LIGHTING: Commercial advertising photography. Use: Soft premium highlights, Natural shadows, Bright cheerful mood, High-end toy commercial lighting
STYLE REFERENCE: Official LEGO Indonesia Premium social media campaign, TikTok viral thumbnail, Modern toy advertising, High CTR design
QUALITY: Ultra realistic, Commercial photography, Premium advertising quality, Sharp focus, Natural human appearance, Consistent LEGO Indonesia branding, 1080x1440`,
      openai: `You are a professional advertising designer creating a premium TikTok thumbnail for LEGO Indonesia.
INPUTS: Cover photo (talent/subject) + Background reference image
Headline text OBJECTIVE: Transform the cover photo into a premium, high-CTR TikTok thumbnail while maintaining a consistent LEGO Indonesia visual identity across all content.
OUTPUT SIZE: 1080 x 1440 px Vertical format TikTok optimized
BACKGROUND: Use the uploaded background reference as the primary visual environment.
Maintain: Overall color palette, Gradient direction, Lighting atmosphere, Visual mood. DO NOT ADD THE LEGO ICON/LOGO.
Background characteristics: Bright and cheerful, Premium and modern, Soft dreamy gradient, Clean composition, Family-friendly atmosphere, Minimal clutter
Add: Floating LEGO bricks in red, yellow, blue, and green, Soft cloud elements if applicable, Subtle depth of field, Light bokeh particles, Soft ambient glow
SUBJECT TREATMENT: Keep the original person/talent recognizable.
IMPORTANT: Preserve facial identity, Natural skin texture, Realistic photography look, No AI-generated face appearance, No excessive beauty filter, No plastic skin, No exaggerated facial features, No cartoon effect
Enhance: Natural lighting, Subject visibility, Sharpness, Contrast, Subject separation from background
HEADLINE: {{HEADLINE}}
TYPOGRAPHY: Large bold rounded display font.
Style: LEGO-inspired, White text, Thick black outline, Strong shadow, High readability, Mobile-first design, Premium 3D effect
TITLE BANNER SYSTEM: Always use the same LEGO Indonesia banner design: Top Banner: LEGO Yellow (#FFD500), Red text. Middle Banner: LEGO Red (#D01012), White text. Bottom Banner: LEGO Yellow (#FFD500), Black text. Banner Style: Rounded corners, Glossy finish, Slight 3D extrusion, Soft highlights, Consistent positioning
COMPOSITION: Visual hierarchy: Headline Face Background. Maintain clear spacing. Avoid clutter. Keep the layout balanced. Ensure readability on mobile screens.
LIGHTING: Commercial advertising photography. Use: Soft premium highlights, Natural shadows, Bright cheerful mood, High-end toy commercial lighting
STYLE REFERENCE: Official LEGO Indonesia Premium social media campaign, TikTok viral thumbnail, Modern toy advertising, High CTR design
QUALITY: Ultra realistic, Commercial photography, Premium advertising quality, Sharp focus, Natural human appearance, Consistent LEGO Indonesia branding, 1080x1440`,
    },
  },
  {
    id: 'lego-p',
    brand: 'LEGO-P',
    templates: {
      gemini: `You are a professional advertising designer creating a premium TikTok thumbnail for LEGO Indonesia.
INPUTS: Cover photo (LEGO product) + Background reference image
Headline text OBJECTIVE: Transform the cover photo into a premium, high-CTR TikTok thumbnail while maintaining a consistent LEGO Indonesia visual identity across all content.
OUTPUT SIZE: 1080 x 1440 px Vertical format TikTok optimized
BACKGROUND: Use the uploaded background reference as the primary visual environment.
Maintain: Overall color palette, Gradient direction, Lighting atmosphere, Visual mood. DO NOT ADD THE LEGO ICON/LOGO.
Background characteristics: Bright and cheerful, Premium and modern, Soft dreamy gradient, Clean composition, Family-friendly atmosphere, Minimal clutter
Add: Floating LEGO bricks in red, yellow, blue, and green, Soft cloud elements if applicable, Subtle depth of field, Light bokeh particles, Soft ambient glow
SUBJECT TREATMENT: Keep the original product recognizable.
IMPORTANT: Preserve product identity.
Enhance: Natural lighting, Product visibility, Sharpness, Contrast, Subject separation from background
PRODUCT TREATMENT: Keep all LEGO products accurate and realistic.
Enhance: Packaging visibility, Product details, Reflections, Contrast, Premium appearance
HEADLINE: {{HEADLINE}}
TYPOGRAPHY: Large bold rounded display font.
Style: LEGO-inspired, White text, Thick black outline, Strong shadow, High readability, Mobile-first design, Premium 3D effect
TITLE BANNER SYSTEM: Always use the same LEGO Indonesia banner design: Top Banner: LEGO Yellow (#FFD500), Red text. Middle Banner: LEGO Red (#D01012), White text. Bottom Banner: LEGO Yellow (#FFD500), Black text. Banner Style: Rounded corners, Glossy finish, Slight 3D extrusion, Soft highlights, Consistent positioning
COMPOSITION: Visual hierarchy: Headline Face LEGO Product. Maintain clear spacing. Avoid clutter. Keep the layout balanced. Ensure readability on mobile screens.
LIGHTING: Commercial advertising photography. Use: Soft premium highlights, Natural shadows, Bright cheerful mood, High-end toy commercial lighting
STYLE REFERENCE: Official LEGO Indonesia Premium social media campaign, TikTok viral thumbnail, Modern toy advertising, High CTR design
QUALITY: Ultra realistic, Commercial photography, Premium advertising quality, Sharp focus, Natural human appearance, Consistent LEGO Indonesia branding, 1080x1440`,
      openai: `You are a professional advertising designer creating a premium TikTok thumbnail for LEGO Indonesia.
INPUTS: Cover photo (LEGO product) + Background reference image
Headline text OBJECTIVE: Transform the cover photo into a premium, high-CTR TikTok thumbnail while maintaining a consistent LEGO Indonesia visual identity across all content.
OUTPUT SIZE: 1080 x 1440 px Vertical format TikTok optimized
BACKGROUND: Use the uploaded background reference as the primary visual environment.
Maintain: Overall color palette, Gradient direction, Lighting atmosphere, Visual mood. DO NOT ADD THE LEGO ICON/LOGO.
Background characteristics: Bright and cheerful, Premium and modern, Soft dreamy gradient, Clean composition, Family-friendly atmosphere, Minimal clutter
Add: Floating LEGO bricks in red, yellow, blue, and green, Soft cloud elements if applicable, Subtle depth of field, Light bokeh particles, Soft ambient glow
SUBJECT TREATMENT: Keep the original product recognizable.
IMPORTANT: Preserve product identity.
Enhance: Natural lighting, Product visibility, Sharpness, Contrast, Subject separation from background
PRODUCT TREATMENT: Keep all LEGO products accurate and realistic.
Enhance: Packaging visibility, Product details, Reflections, Contrast, Premium appearance
HEADLINE: {{HEADLINE}}
TYPOGRAPHY: Large bold rounded display font.
Style: LEGO-inspired, White text, Thick black outline, Strong shadow, High readability, Mobile-first design, Premium 3D effect
TITLE BANNER SYSTEM: Always use the same LEGO Indonesia banner design: Top Banner: LEGO Yellow (#FFD500), Red text. Middle Banner: LEGO Red (#D01012), White text. Bottom Banner: LEGO Yellow (#FFD500), Black text. Banner Style: Rounded corners, Glossy finish, Slight 3D extrusion, Soft highlights, Consistent positioning
COMPOSITION: Visual hierarchy: Headline Face LEGO Product. Maintain clear spacing. Avoid clutter. Keep the layout balanced. Ensure readability on mobile screens.
LIGHTING: Commercial advertising photography. Use: Soft premium highlights, Natural shadows, Bright cheerful mood, High-end toy commercial lighting
STYLE REFERENCE: Official LEGO Indonesia Premium social media campaign, TikTok viral thumbnail, Modern toy advertising, High CTR design
QUALITY: Ultra realistic, Commercial photography, Premium advertising quality, Sharp focus, Natural human appearance, Consistent LEGO Indonesia branding, 1080x1440`,
    },
  },
  {
    id: 'lego-sp',
    brand: 'LEGO-SP',
    templates: {
      gemini: `You are a professional advertising designer creating a premium TikTok thumbnail for LEGO Indonesia.
INPUTS: Cover photo (talent + LEGO product) + Background reference image
Headline text OBJECTIVE: Transform the cover photo into a premium, high-CTR TikTok thumbnail while maintaining a consistent LEGO Indonesia visual identity across all content.
OUTPUT SIZE: 1080 x 1440 px Vertical format TikTok optimized
BACKGROUND: Use the uploaded background reference as the primary visual environment.
Maintain: Overall color palette, Gradient direction, Lighting atmosphere, Visual mood. DO NOT ADD THE LEGO ICON/LOGO.
Background characteristics: Bright and cheerful, Premium and modern, Soft dreamy gradient, Clean composition, Family-friendly atmosphere, Minimal clutter
Add: Floating LEGO bricks in red, yellow, blue, and green, Soft cloud elements if applicable, Subtle depth of field, Light bokeh particles, Soft ambient glow
SUBJECT TREATMENT: Keep the original person and the LEGO product both recognizable.
IMPORTANT: Preserve facial and product identity. Preserve facial identity, Natural skin texture, Realistic photography look, No AI-generated face appearance, No excessive beauty filter, No plastic skin, No exaggerated facial features, No cartoon effect. Preserve the product's exact shape, packaging, color, and branding — no invented or altered product details.
Enhance: Natural lighting, Subject visibility, Product visibility, Sharpness, Contrast, Subject separation from background
PRODUCT TREATMENT: Keep all LEGO products accurate and realistic.
Enhance: Packaging visibility, Product details, Reflections, Contrast, Premium appearance
HEADLINE: {{HEADLINE}}
TYPOGRAPHY: Large bold rounded display font.
Style: LEGO-inspired, White text, Thick black outline, Strong shadow, High readability, Mobile-first design, Premium 3D effect
TITLE BANNER SYSTEM: Always use the same LEGO Indonesia banner design: Top Banner: LEGO Yellow (#FFD500), Red text. Middle Banner: LEGO Red (#D01012), White text. Bottom Banner: LEGO Yellow (#FFD500), Black text. Banner Style: Rounded corners, Glossy finish, Slight 3D extrusion, Soft highlights, Consistent positioning
COMPOSITION: Visual hierarchy: Headline Face LEGO Product. Maintain clear spacing. Avoid clutter. Keep the layout balanced. Ensure readability on mobile screens.
LIGHTING: Commercial advertising photography. Use: Soft premium highlights, Natural shadows, Bright cheerful mood, High-end toy commercial lighting
STYLE REFERENCE: Official LEGO Indonesia Premium social media campaign, TikTok viral thumbnail, Modern toy advertising, High CTR design
QUALITY: Ultra realistic, Commercial photography, Premium advertising quality, Sharp focus, Natural human appearance, Consistent LEGO Indonesia branding, 1080x1440`,
      openai: `You are a professional advertising designer creating a premium TikTok thumbnail for LEGO Indonesia.
INPUTS: Cover photo (talent + LEGO product) + Background reference image
Headline text OBJECTIVE: Transform the cover photo into a premium, high-CTR TikTok thumbnail while maintaining a consistent LEGO Indonesia visual identity across all content.
OUTPUT SIZE: 1080 x 1440 px Vertical format TikTok optimized
BACKGROUND: Use the uploaded background reference as the primary visual environment.
Maintain: Overall color palette, Gradient direction, Lighting atmosphere, Visual mood. DO NOT ADD THE LEGO ICON/LOGO.
Background characteristics: Bright and cheerful, Premium and modern, Soft dreamy gradient, Clean composition, Family-friendly atmosphere, Minimal clutter
Add: Floating LEGO bricks in red, yellow, blue, and green, Soft cloud elements if applicable, Subtle depth of field, Light bokeh particles, Soft ambient glow
SUBJECT TREATMENT: Keep the original person and the LEGO product both recognizable.
IMPORTANT: Preserve facial and product identity. Preserve facial identity, Natural skin texture, Realistic photography look, No AI-generated face appearance, No excessive beauty filter, No plastic skin, No exaggerated facial features, No cartoon effect. Preserve the product's exact shape, packaging, color, and branding — no invented or altered product details.
Enhance: Natural lighting, Subject visibility, Product visibility, Sharpness, Contrast, Subject separation from background
PRODUCT TREATMENT: Keep all LEGO products accurate and realistic.
Enhance: Packaging visibility, Product details, Reflections, Contrast, Premium appearance
HEADLINE: {{HEADLINE}}
TYPOGRAPHY: Large bold rounded display font.
Style: LEGO-inspired, White text, Thick black outline, Strong shadow, High readability, Mobile-first design, Premium 3D effect
TITLE BANNER SYSTEM: Always use the same LEGO Indonesia banner design: Top Banner: LEGO Yellow (#FFD500), Red text. Middle Banner: LEGO Red (#D01012), White text. Bottom Banner: LEGO Yellow (#FFD500), Black text. Banner Style: Rounded corners, Glossy finish, Slight 3D extrusion, Soft highlights, Consistent positioning
COMPOSITION: Visual hierarchy: Headline Face LEGO Product. Maintain clear spacing. Avoid clutter. Keep the layout balanced. Ensure readability on mobile screens.
LIGHTING: Commercial advertising photography. Use: Soft premium highlights, Natural shadows, Bright cheerful mood, High-end toy commercial lighting
STYLE REFERENCE: Official LEGO Indonesia Premium social media campaign, TikTok viral thumbnail, Modern toy advertising, High CTR design
QUALITY: Ultra realistic, Commercial photography, Premium advertising quality, Sharp focus, Natural human appearance, Consistent LEGO Indonesia branding, 1080x1440`,
    },
  },
  {
    // "MultiP" — multiple LEGO products merged into a single shot. Pairs
    // with the "Multiple Product Reference" checkbox above the Reference
    // Images upload boxes: when that's on, every filled product slot gets
    // sent along with this preset so the model has all of them to combine.
    id: 'lego-multip',
    brand: 'LEGO-MultiP',
    templates: {
      gemini: `You are a professional advertising designer creating a premium TikTok thumbnail for LEGO Indonesia. Combine these two products into one image.
INPUTS: Cover photo (LEGO product) + Background reference image
Headline text OBJECTIVE: Transform the cover photo into a premium, high-CTR TikTok thumbnail while maintaining a consistent LEGO Indonesia visual identity across all content.
OUTPUT SIZE: 1080 x 1440 px Vertical format TikTok optimized
BACKGROUND: Use the uploaded background reference as the primary visual environment.
Maintain: Overall color palette, Gradient direction, Lighting atmosphere, Visual mood. DO NOT ADD THE LEGO ICON/LOGO. DO NOT ADD THE TALENT OR PERSON, STRICTLY PRODUCT ONLY.
Background characteristics: Bright and cheerful, Premium and modern, Soft dreamy gradient, Clean composition, Family-friendly atmosphere, Minimal clutter
Add: Floating LEGO bricks in red, yellow, blue, and green, Soft cloud elements if applicable, Subtle depth of field, Light bokeh particles, Soft ambient glow
PRODUCT TREATMENT: Keep the original product recognizable. Merge all of the product images into one.
IMPORTANT: Preserve product identity. Maintain the table the products is on.
Enhance: Natural lighting, Product visibility, Sharpness, Contrast, Subject separation from background
PRODUCT TREATMENT: Keep all LEGO products accurate and realistic.
Enhance: Packaging visibility, Product details, Reflections, Contrast, Premium appearance
HEADLINE: {{HEADLINE}}
TYPOGRAPHY: Large bold rounded display font.
Style: LEGO-inspired, White text, Thick black outline, Strong shadow, High readability, Mobile-first design, Premium 3D effect
TITLE BANNER SYSTEM: Always use the same LEGO Indonesia banner design: Top Banner: LEGO Yellow (#FFD500), Red text. Middle Banner: LEGO Red (#D01012), White text. Bottom Banner: LEGO Yellow (#FFD500), Black text. Banner Style: Rounded corners, Glossy finish, Slight 3D extrusion, Soft highlights, Consistent positioning
COMPOSITION: Visual hierarchy: Headline Face LEGO Product. Maintain clear spacing. Avoid clutter. Keep the layout balanced. Ensure readability on mobile screens.
LIGHTING: Commercial advertising photography. Use: Soft premium highlights, Natural shadows, Bright cheerful mood, High-end toy commercial lighting
STYLE REFERENCE: Official LEGO Indonesia Premium social media campaign, TikTok viral thumbnail, Modern toy advertising, High CTR design
QUALITY: Ultra realistic, Commercial photography, Premium advertising quality, Sharp focus, Natural human appearance, Consistent LEGO Indonesia branding, 1080x1440`,
      openai: `You are a professional advertising designer creating a premium TikTok thumbnail for LEGO Indonesia. Combine these two products into one image.
INPUTS: Cover photo (LEGO product) + Background reference image
Headline text OBJECTIVE: Transform the cover photo into a premium, high-CTR TikTok thumbnail while maintaining a consistent LEGO Indonesia visual identity across all content.
OUTPUT SIZE: 1080 x 1440 px Vertical format TikTok optimized
BACKGROUND: Use the uploaded background reference as the primary visual environment.
Maintain: Overall color palette, Gradient direction, Lighting atmosphere, Visual mood. DO NOT ADD THE LEGO ICON/LOGO. DO NOT ADD THE TALENT OR PERSON, STRICTLY PRODUCT ONLY.
Background characteristics: Bright and cheerful, Premium and modern, Soft dreamy gradient, Clean composition, Family-friendly atmosphere, Minimal clutter
Add: Floating LEGO bricks in red, yellow, blue, and green, Soft cloud elements if applicable, Subtle depth of field, Light bokeh particles, Soft ambient glow
PRODUCT TREATMENT: Keep the original product recognizable. Merge all of the product images into one.
IMPORTANT: Preserve product identity. Maintain the table the products is on.
Enhance: Natural lighting, Product visibility, Sharpness, Contrast, Subject separation from background
PRODUCT TREATMENT: Keep all LEGO products accurate and realistic.
Enhance: Packaging visibility, Product details, Reflections, Contrast, Premium appearance
HEADLINE: {{HEADLINE}}
TYPOGRAPHY: Large bold rounded display font.
Style: LEGO-inspired, White text, Thick black outline, Strong shadow, High readability, Mobile-first design, Premium 3D effect
TITLE BANNER SYSTEM: Always use the same LEGO Indonesia banner design: Top Banner: LEGO Yellow (#FFD500), Red text. Middle Banner: LEGO Red (#D01012), White text. Bottom Banner: LEGO Yellow (#FFD500), Black text. Banner Style: Rounded corners, Glossy finish, Slight 3D extrusion, Soft highlights, Consistent positioning
COMPOSITION: Visual hierarchy: Headline Face LEGO Product. Maintain clear spacing. Avoid clutter. Keep the layout balanced. Ensure readability on mobile screens.
LIGHTING: Commercial advertising photography. Use: Soft premium highlights, Natural shadows, Bright cheerful mood, High-end toy commercial lighting
STYLE REFERENCE: Official LEGO Indonesia Premium social media campaign, TikTok viral thumbnail, Modern toy advertising, High CTR design
QUALITY: Ultra realistic, Commercial photography, Premium advertising quality, Sharp focus, Natural human appearance, Consistent LEGO Indonesia branding, 1080x1440`,
    },
  },
]

// ── Lenovo Themes ────────────────────────────────────────────
// A THIRD option under the Lenovo brand row (alongside SP/P), only for
// Lenovo. Clicking "Themes" reveals 6 product-lineup looks (Legion Tab,
// Yoga Tab, Idea Tab Pro, MotoPad 60 Lite/Neo/Pro), each with its own S/SP/P
// trio built off the same Lenovo-SP/Lenovo-P skeleton — same section
// structure and IMPORTANT/SUBJECT TREATMENT wording as the rest of the
// presets, but with a fixed background scene, color palette, mood and
// typography per lineup so the output matches that lineup's official look
// regardless of what background photo gets uploaded (same "override the
// uploaded background with a fixed brand identity" approach the LEGO presets
// already use). Like Universal/LEGO, no separately-tuned Gemini scaffold —
// same brief for both providers; split `gemini` out later if Gemini gets
// unlocked and needs Nano-Banana-specific guardrails.
const LENOVO_THEMES = [
  {
    id: 'legion-tab',
    label: 'Legion Tab',
    tagline: 'Play All Out',
    variants: {
      SP: { id: 'lenovo-legion-tab-sp', templates: { gemini:
`You are a professional advertising designer creating a premium TikTok thumbnail for Lenovo Legion Tab.
INPUTS: Cover photo (talent + product) + Background reference image
Headline text OBJECTIVE: Transform the cover photo into a premium, high-CTR TikTok thumbnail while maintaining a consistent Lenovo Legion Tab "Play All Out" visual identity across all content.
OUTPUT SIZE: 1080 x 1440 px Vertical format TikTok optimized
BACKGROUND: Use the uploaded background reference as the actual visual environment for this shot — it is the real backdrop, not a mood board to be replaced or ignored. Keep its own content, layout and composition intact; render it as a natural, photographically real scene (never a flat illustration/clip-art copy). Grade its lighting, shadows and color palette toward the Lenovo Legion Tab "Play All Out" identity below.
Maintain: deep black as the base, split by two clashing neon color forces — fiery red-orange smoke and embers on one side, electric blue-violet neon light and haze on the other — as the dominant color story across the whole image.
Background characteristics: Intense rival-color esports battle mood — dramatic, cinematic and adrenaline-charged, like two opposing forces clashing in a dark arena. Drifting smoke, sparks and a wet reflective floor mirroring both colors. Premium and polished. Consistent with the Lenovo Legion Tab "Play All Out" color and lighting identity.
Add: Subtle depth of field, Soft ambient glow
SUBJECT TREATMENT: Keep both the subject/talent and the product recognizable, make them stand out together as the focus point. Keep the original person and the product recognizable.
IMPORTANT: Preserve facial and product identity. Preserve facial identity, Natural skin texture, Realistic photography look, No AI-generated face appearance, No excessive beauty filter, No plastic skin, No exaggerated facial features, No cartoon effect. Preserve the product's exact shape, packaging, color, branding and markings — no invented or altered product details.
Enhance: Natural lighting, Subject visibility, Product visibility, Sharpness, Contrast, Subject separation from background
HEADLINE: {{HEADLINE}}
TYPOGRAPHY: A bold, rough-edged handwritten/graffiti marker-style display font for the main headline text — bright white fill with a vivid red glow/outline, aggressive, high-energy and high-contrast against the dark background, like a spray-painted arena banner. DEVICE TAG: place a small uppercase label reading "LEGION GEN 3" fixed in the top-left corner of the frame, in white or vivid red to match this theme's palette — present consistently in every generation of this theme, independent of the headline.
COMPOSITION: Visual hierarchy: Subject Product Headline Background. Maintain clear spacing. Avoid clutter. Keep the layout balanced. Ensure readability on mobile screens.
LIGHTING: Commercial advertising photography. Use: Dramatic rim lighting, Deep atmospheric shadows, High-energy rival-color esports mood, cinematic smoke and spark effects
STYLE REFERENCE: Official Lenovo Legion Tab "Play All Out" premium social media campaign, TikTok viral thumbnail, Modern tech advertising, High CTR design
QUALITY: Ultra realistic, Commercial photography, Premium advertising quality, Sharp focus, Consistent Lenovo Legion Tab branding, 1080x1440`,
      get openai() { return this.gemini } } },
      P: { id: 'lenovo-legion-tab-p', templates: { gemini:
`You are a professional advertising designer creating a premium TikTok thumbnail for Lenovo Legion Tab.
INPUTS: Cover photo (product) + Background reference image. No people in frame.
Headline text OBJECTIVE: Transform the cover photo into a premium, high-CTR TikTok thumbnail while maintaining a consistent Lenovo Legion Tab "Play All Out" visual identity across all content.
OUTPUT SIZE: 1080 x 1440 px Vertical format TikTok optimized
BACKGROUND: Use the uploaded background reference as the actual visual environment for this shot — it is the real backdrop, not a mood board to be replaced or ignored. Keep its own content, layout and composition intact; render it as a natural, photographically real scene (never a flat illustration/clip-art copy). Grade its lighting, shadows and color palette toward the Lenovo Legion Tab "Play All Out" identity below.
Maintain: deep black as the base, split by two clashing neon color forces — fiery red-orange smoke and embers on one side, electric blue-violet neon light and haze on the other — as the dominant color story across the whole image.
Background characteristics: Intense rival-color esports battle mood — dramatic, cinematic and adrenaline-charged, like two opposing forces clashing in a dark arena. Drifting smoke, sparks and a wet reflective floor mirroring both colors. Premium and polished. Consistent with the Lenovo Legion Tab "Play All Out" color and lighting identity.
Add: Subtle depth of field, Soft ambient glow
SUBJECT TREATMENT: The product is the sole subject and absolute focus point of the image. Do NOT include any people, talent, hands, or human presence anywhere in the frame — product only. Keep the product recognizable and standing out as the hero of the shot.
IMPORTANT: Preserve product identity exactly. Preserve the product's exact shape, packaging, color, branding and markings. Realistic photography look, No AI-generated distortion, No cartoon effect, No invented or altered product details.
Enhance: Natural lighting, Product visibility, Sharpness, Contrast, Subject separation from background
HEADLINE: {{HEADLINE}}
TYPOGRAPHY: A bold, rough-edged handwritten/graffiti marker-style display font for the main headline text — bright white fill with a vivid red glow/outline, aggressive, high-energy and high-contrast against the dark background, like a spray-painted arena banner. DEVICE TAG: place a small uppercase label reading "LEGION GEN 3" fixed in the top-left corner of the frame, in white or vivid red to match this theme's palette — present consistently in every generation of this theme, independent of the headline.
COMPOSITION: Visual hierarchy: Product Headline Background. Maintain clear spacing. Avoid clutter. Keep the layout balanced. Ensure readability on mobile screens.
LIGHTING: Commercial advertising photography. Use: Dramatic rim lighting, Deep atmospheric shadows, High-energy rival-color esports mood, cinematic smoke and spark effects
STYLE REFERENCE: Official Lenovo Legion Tab "Play All Out" premium social media campaign, TikTok viral thumbnail, Modern tech advertising, High CTR design
QUALITY: Ultra realistic, Commercial photography, Premium advertising quality, Sharp focus, Consistent Lenovo Legion Tab branding, 1080x1440`,
      get openai() { return this.gemini } } },
      S: { id: 'lenovo-legion-tab-s', templates: { gemini:
`You are a professional advertising designer creating a premium TikTok thumbnail for Lenovo Legion Tab.
INPUTS: Cover photo (talent/subject) + Background reference image
Headline text OBJECTIVE: Transform the cover photo into a premium, high-CTR TikTok thumbnail while maintaining a consistent Lenovo Legion Tab "Play All Out" visual identity across all content.
OUTPUT SIZE: 1080 x 1440 px Vertical format TikTok optimized
BACKGROUND: Use the uploaded background reference as the actual visual environment for this shot — it is the real backdrop, not a mood board to be replaced or ignored. Keep its own content, layout and composition intact; render it as a natural, photographically real scene (never a flat illustration/clip-art copy). Grade its lighting, shadows and color palette toward the Lenovo Legion Tab "Play All Out" identity below.
Maintain: deep black as the base, split by two clashing neon color forces — fiery red-orange smoke and embers on one side, electric blue-violet neon light and haze on the other — as the dominant color story across the whole image.
Background characteristics: Intense rival-color esports battle mood — dramatic, cinematic and adrenaline-charged, like two opposing forces clashing in a dark arena. Drifting smoke, sparks and a wet reflective floor mirroring both colors. Premium and polished. Consistent with the Lenovo Legion Tab "Play All Out" color and lighting identity.
Add: Subtle depth of field, Soft ambient glow
SUBJECT TREATMENT: Keep the subject recognizable, make it stand out and the focus point. Keep the original person recognizable.
IMPORTANT: Preserve facial identity, Natural skin texture, Realistic photography look, No AI-generated face appearance, No excessive beauty filter, No plastic skin, No exaggerated facial features, No cartoon effect
Enhance: Natural lighting, Subject visibility, Sharpness, Contrast, Subject separation from background
HEADLINE: {{HEADLINE}}
TYPOGRAPHY: A bold, rough-edged handwritten/graffiti marker-style display font for the main headline text — bright white fill with a vivid red glow/outline, aggressive, high-energy and high-contrast against the dark background, like a spray-painted arena banner. DEVICE TAG: place a small uppercase label reading "LEGION GEN 3" fixed in the top-left corner of the frame, in white or vivid red to match this theme's palette — present consistently in every generation of this theme, independent of the headline.
COMPOSITION: Visual hierarchy: Subject Headline Background. Maintain clear spacing. Avoid clutter. Keep the layout balanced. Ensure readability on mobile screens.
LIGHTING: Commercial advertising photography. Use: Dramatic rim lighting, Deep atmospheric shadows, High-energy rival-color esports mood, cinematic smoke and spark effects
STYLE REFERENCE: Official Lenovo Legion Tab "Play All Out" premium social media campaign, TikTok viral thumbnail, Modern tech advertising, High CTR design
QUALITY: Ultra realistic, Commercial photography, Premium advertising quality, Sharp focus, Consistent Lenovo Legion Tab branding, 1080x1440`,
      get openai() { return this.gemini } } },
    },
  },
  {
    id: 'yoga-tab',
    label: 'Yoga Tab',
    tagline: 'Flow In Color',
    variants: {
      SP: { id: 'lenovo-yoga-tab-sp', templates: { gemini:
`You are a professional advertising designer creating a premium TikTok thumbnail for Lenovo Yoga Tab.
INPUTS: Cover photo (talent + product) + Background reference image
Headline text OBJECTIVE: Transform the cover photo into a premium, high-CTR TikTok thumbnail while maintaining a consistent Lenovo Yoga Tab "Flow In Color" visual identity across all content.
OUTPUT SIZE: 1080 x 1440 px Vertical format TikTok optimized
BACKGROUND: Use the uploaded background reference as the actual visual environment for this shot — it is the real backdrop, not a mood board to be replaced or ignored. Keep its own content, layout and composition intact; render it as a natural, photographically real scene (never a flat illustration/clip-art copy). Grade its lighting, shadows and color palette toward the Lenovo Yoga Tab "Flow In Color" identity below.
Maintain: a clean, bright color grade of crisp white and soft daylight blue, lifted by a gentle lavender-purple LED accent glow, as the dominant color story across the whole image.
Background characteristics: Clean, bright and modern mood — fresh, airy and calmly creative, like a sunlit design studio with soft ambient LED glow. Premium and polished. Consistent with the Lenovo Yoga Tab "Flow In Color" color and lighting identity.
Add: Subtle depth of field, Soft ambient glow
SUBJECT TREATMENT: Keep both the subject/talent and the product recognizable, make them stand out together as the focus point. Keep the original person and the product recognizable.
IMPORTANT: Preserve facial and product identity. Preserve facial identity, Natural skin texture, Realistic photography look, No AI-generated face appearance, No excessive beauty filter, No plastic skin, No exaggerated facial features, No cartoon effect. Preserve the product's exact shape, packaging, color, branding and markings — no invented or altered product details.
Enhance: Natural lighting, Subject visibility, Product visibility, Sharpness, Contrast, Subject separation from background
HEADLINE: {{HEADLINE}}
TYPOGRAPHY: A friendly, rounded bold sans-serif for the main headline text in white or deep charcoal, paired with a light, flowing script/cursive accent style for any secondary tagline text in vivid purple — clean, elegant and calming. DEVICE TAG: place a small uppercase label reading "YOGA TAB" fixed in the top-left corner of the frame, in white or vivid purple to match this theme's palette — present consistently in every generation of this theme, independent of the headline.
COMPOSITION: Visual hierarchy: Subject Product Headline Background. Maintain clear spacing. Avoid clutter. Keep the layout balanced. Ensure readability on mobile screens.
LIGHTING: Commercial advertising photography. Use: Bright natural daylight, Soft ambient LED accent glow, Clean fresh mood, crisp modern highlights
STYLE REFERENCE: Official Lenovo Yoga Tab "Flow In Color" premium social media campaign, TikTok viral thumbnail, Modern tech advertising, High CTR design
QUALITY: Ultra realistic, Commercial photography, Premium advertising quality, Sharp focus, Consistent Lenovo Yoga Tab branding, 1080x1440`,
      get openai() { return this.gemini } } },
      P: { id: 'lenovo-yoga-tab-p', templates: { gemini:
`You are a professional advertising designer creating a premium TikTok thumbnail for Lenovo Yoga Tab.
INPUTS: Cover photo (product) + Background reference image. No people in frame.
Headline text OBJECTIVE: Transform the cover photo into a premium, high-CTR TikTok thumbnail while maintaining a consistent Lenovo Yoga Tab "Flow In Color" visual identity across all content.
OUTPUT SIZE: 1080 x 1440 px Vertical format TikTok optimized
BACKGROUND: Use the uploaded background reference as the actual visual environment for this shot — it is the real backdrop, not a mood board to be replaced or ignored. Keep its own content, layout and composition intact; render it as a natural, photographically real scene (never a flat illustration/clip-art copy). Grade its lighting, shadows and color palette toward the Lenovo Yoga Tab "Flow In Color" identity below.
Maintain: a clean, bright color grade of crisp white and soft daylight blue, lifted by a gentle lavender-purple LED accent glow, as the dominant color story across the whole image.
Background characteristics: Clean, bright and modern mood — fresh, airy and calmly creative, like a sunlit design studio with soft ambient LED glow. Premium and polished. Consistent with the Lenovo Yoga Tab "Flow In Color" color and lighting identity.
Add: Subtle depth of field, Soft ambient glow
SUBJECT TREATMENT: The product is the sole subject and absolute focus point of the image. Do NOT include any people, talent, hands, or human presence anywhere in the frame — product only. Keep the product recognizable and standing out as the hero of the shot.
IMPORTANT: Preserve product identity exactly. Preserve the product's exact shape, packaging, color, branding and markings. Realistic photography look, No AI-generated distortion, No cartoon effect, No invented or altered product details.
Enhance: Natural lighting, Product visibility, Sharpness, Contrast, Subject separation from background
HEADLINE: {{HEADLINE}}
TYPOGRAPHY: A friendly, rounded bold sans-serif for the main headline text in white or deep charcoal, paired with a light, flowing script/cursive accent style for any secondary tagline text in vivid purple — clean, elegant and calming. DEVICE TAG: place a small uppercase label reading "YOGA TAB" fixed in the top-left corner of the frame, in white or vivid purple to match this theme's palette — present consistently in every generation of this theme, independent of the headline.
COMPOSITION: Visual hierarchy: Product Headline Background. Maintain clear spacing. Avoid clutter. Keep the layout balanced. Ensure readability on mobile screens.
LIGHTING: Commercial advertising photography. Use: Bright natural daylight, Soft ambient LED accent glow, Clean fresh mood, crisp modern highlights
STYLE REFERENCE: Official Lenovo Yoga Tab "Flow In Color" premium social media campaign, TikTok viral thumbnail, Modern tech advertising, High CTR design
QUALITY: Ultra realistic, Commercial photography, Premium advertising quality, Sharp focus, Consistent Lenovo Yoga Tab branding, 1080x1440`,
      get openai() { return this.gemini } } },
      S: { id: 'lenovo-yoga-tab-s', templates: { gemini:
`You are a professional advertising designer creating a premium TikTok thumbnail for Lenovo Yoga Tab.
INPUTS: Cover photo (talent/subject) + Background reference image
Headline text OBJECTIVE: Transform the cover photo into a premium, high-CTR TikTok thumbnail while maintaining a consistent Lenovo Yoga Tab "Flow In Color" visual identity across all content.
OUTPUT SIZE: 1080 x 1440 px Vertical format TikTok optimized
BACKGROUND: Use the uploaded background reference as the actual visual environment for this shot — it is the real backdrop, not a mood board to be replaced or ignored. Keep its own content, layout and composition intact; render it as a natural, photographically real scene (never a flat illustration/clip-art copy). Grade its lighting, shadows and color palette toward the Lenovo Yoga Tab "Flow In Color" identity below.
Maintain: a clean, bright color grade of crisp white and soft daylight blue, lifted by a gentle lavender-purple LED accent glow, as the dominant color story across the whole image.
Background characteristics: Clean, bright and modern mood — fresh, airy and calmly creative, like a sunlit design studio with soft ambient LED glow. Premium and polished. Consistent with the Lenovo Yoga Tab "Flow In Color" color and lighting identity.
Add: Subtle depth of field, Soft ambient glow
SUBJECT TREATMENT: Keep the subject recognizable, make it stand out and the focus point. Keep the original person recognizable.
IMPORTANT: Preserve facial identity, Natural skin texture, Realistic photography look, No AI-generated face appearance, No excessive beauty filter, No plastic skin, No exaggerated facial features, No cartoon effect
Enhance: Natural lighting, Subject visibility, Sharpness, Contrast, Subject separation from background
HEADLINE: {{HEADLINE}}
TYPOGRAPHY: A friendly, rounded bold sans-serif for the main headline text in white or deep charcoal, paired with a light, flowing script/cursive accent style for any secondary tagline text in vivid purple — clean, elegant and calming. DEVICE TAG: place a small uppercase label reading "YOGA TAB" fixed in the top-left corner of the frame, in white or vivid purple to match this theme's palette — present consistently in every generation of this theme, independent of the headline.
COMPOSITION: Visual hierarchy: Subject Headline Background. Maintain clear spacing. Avoid clutter. Keep the layout balanced. Ensure readability on mobile screens.
LIGHTING: Commercial advertising photography. Use: Bright natural daylight, Soft ambient LED accent glow, Clean fresh mood, crisp modern highlights
STYLE REFERENCE: Official Lenovo Yoga Tab "Flow In Color" premium social media campaign, TikTok viral thumbnail, Modern tech advertising, High CTR design
QUALITY: Ultra realistic, Commercial photography, Premium advertising quality, Sharp focus, Consistent Lenovo Yoga Tab branding, 1080x1440`,
      get openai() { return this.gemini } } },
    },
  },
  {
    id: 'idea-tab-pro',
    label: 'Idea Tab Pro',
    tagline: 'Create More, Achieve More',
    variants: {
      SP: { id: 'lenovo-idea-tab-pro-sp', templates: { gemini:
`You are a professional advertising designer creating a premium TikTok thumbnail for Lenovo Idea Tab Pro.
INPUTS: Cover photo (talent + product) + Background reference image
Headline text OBJECTIVE: Transform the cover photo into a premium, high-CTR TikTok thumbnail while maintaining a consistent Lenovo Idea Tab Pro "Create More, Achieve More" visual identity across all content.
OUTPUT SIZE: 1080 x 1440 px Vertical format TikTok optimized
BACKGROUND: Use the uploaded background reference as the actual visual environment for this shot — it is the real backdrop, not a mood board to be replaced or ignored. Keep its own content, layout and composition intact; render it as a natural, photographically real scene (never a flat illustration/clip-art copy). Grade its lighting, shadows and color palette toward the Lenovo Idea Tab Pro "Create More, Achieve More" identity below.
Maintain: a warm golden-hour color grade of amber, gold and burnt-orange sunset tones, softened by warm charcoal and marble neutrals, as the dominant color story across the whole image.
Background characteristics: Premium, sophisticated executive mood — warm, confident and aspirational, like a high-rise corner office at sunset. Polished and refined. Consistent with the Lenovo Idea Tab Pro "Create More, Achieve More" color and lighting identity.
Add: Subtle depth of field, Soft ambient glow
SUBJECT TREATMENT: Keep both the subject/talent and the product recognizable, make them stand out together as the focus point. Keep the original person and the product recognizable.
IMPORTANT: Preserve facial and product identity. Preserve facial identity, Natural skin texture, Realistic photography look, No AI-generated face appearance, No excessive beauty filter, No plastic skin, No exaggerated facial features, No cartoon effect. Preserve the product's exact shape, packaging, color, branding and markings — no invented or altered product details.
Enhance: Natural lighting, Subject visibility, Product visibility, Sharpness, Contrast, Subject separation from background
HEADLINE: {{HEADLINE}}
TYPOGRAPHY: A confident, elegant bold sans-serif for the main headline text in white or warm brown, paired with a refined thin-weight italic accent style for any secondary tagline text in warm brown or gold — premium, executive and aspirational. DEVICE TAG: place a small uppercase label reading "IDEA TAB PRO" fixed in the top-left corner of the frame, in white or warm brown to match this theme's palette — present consistently in every generation of this theme, independent of the headline.
COMPOSITION: Visual hierarchy: Subject Product Headline Background. Maintain clear spacing. Avoid clutter. Keep the layout balanced. Ensure readability on mobile screens.
LIGHTING: Commercial advertising photography. Use: Warm golden-hour highlights, Soft directional sunset light, Premium executive mood, cinematic warm glow
STYLE REFERENCE: Official Lenovo Idea Tab Pro "Create More, Achieve More" premium social media campaign, TikTok viral thumbnail, Modern tech advertising, High CTR design
QUALITY: Ultra realistic, Commercial photography, Premium advertising quality, Sharp focus, Consistent Lenovo Idea Tab Pro branding, 1080x1440`,
      get openai() { return this.gemini } } },
      P: { id: 'lenovo-idea-tab-pro-p', templates: { gemini:
`You are a professional advertising designer creating a premium TikTok thumbnail for Lenovo Idea Tab Pro.
INPUTS: Cover photo (product) + Background reference image. No people in frame.
Headline text OBJECTIVE: Transform the cover photo into a premium, high-CTR TikTok thumbnail while maintaining a consistent Lenovo Idea Tab Pro "Create More, Achieve More" visual identity across all content.
OUTPUT SIZE: 1080 x 1440 px Vertical format TikTok optimized
BACKGROUND: Use the uploaded background reference as the actual visual environment for this shot — it is the real backdrop, not a mood board to be replaced or ignored. Keep its own content, layout and composition intact; render it as a natural, photographically real scene (never a flat illustration/clip-art copy). Grade its lighting, shadows and color palette toward the Lenovo Idea Tab Pro "Create More, Achieve More" identity below.
Maintain: a warm golden-hour color grade of amber, gold and burnt-orange sunset tones, softened by warm charcoal and marble neutrals, as the dominant color story across the whole image.
Background characteristics: Premium, sophisticated executive mood — warm, confident and aspirational, like a high-rise corner office at sunset. Polished and refined. Consistent with the Lenovo Idea Tab Pro "Create More, Achieve More" color and lighting identity.
Add: Subtle depth of field, Soft ambient glow
SUBJECT TREATMENT: The product is the sole subject and absolute focus point of the image. Do NOT include any people, talent, hands, or human presence anywhere in the frame — product only. Keep the product recognizable and standing out as the hero of the shot.
IMPORTANT: Preserve product identity exactly. Preserve the product's exact shape, packaging, color, branding and markings. Realistic photography look, No AI-generated distortion, No cartoon effect, No invented or altered product details.
Enhance: Natural lighting, Product visibility, Sharpness, Contrast, Subject separation from background
HEADLINE: {{HEADLINE}}
TYPOGRAPHY: A confident, elegant bold sans-serif for the main headline text in white or warm brown, paired with a refined thin-weight italic accent style for any secondary tagline text in warm brown or gold — premium, executive and aspirational. DEVICE TAG: place a small uppercase label reading "IDEA TAB PRO" fixed in the top-left corner of the frame, in white or warm brown to match this theme's palette — present consistently in every generation of this theme, independent of the headline.
COMPOSITION: Visual hierarchy: Product Headline Background. Maintain clear spacing. Avoid clutter. Keep the layout balanced. Ensure readability on mobile screens.
LIGHTING: Commercial advertising photography. Use: Warm golden-hour highlights, Soft directional sunset light, Premium executive mood, cinematic warm glow
STYLE REFERENCE: Official Lenovo Idea Tab Pro "Create More, Achieve More" premium social media campaign, TikTok viral thumbnail, Modern tech advertising, High CTR design
QUALITY: Ultra realistic, Commercial photography, Premium advertising quality, Sharp focus, Consistent Lenovo Idea Tab Pro branding, 1080x1440`,
      get openai() { return this.gemini } } },
      S: { id: 'lenovo-idea-tab-pro-s', templates: { gemini:
`You are a professional advertising designer creating a premium TikTok thumbnail for Lenovo Idea Tab Pro.
INPUTS: Cover photo (talent/subject) + Background reference image
Headline text OBJECTIVE: Transform the cover photo into a premium, high-CTR TikTok thumbnail while maintaining a consistent Lenovo Idea Tab Pro "Create More, Achieve More" visual identity across all content.
OUTPUT SIZE: 1080 x 1440 px Vertical format TikTok optimized
BACKGROUND: Use the uploaded background reference as the actual visual environment for this shot — it is the real backdrop, not a mood board to be replaced or ignored. Keep its own content, layout and composition intact; render it as a natural, photographically real scene (never a flat illustration/clip-art copy). Grade its lighting, shadows and color palette toward the Lenovo Idea Tab Pro "Create More, Achieve More" identity below.
Maintain: a warm golden-hour color grade of amber, gold and burnt-orange sunset tones, softened by warm charcoal and marble neutrals, as the dominant color story across the whole image.
Background characteristics: Premium, sophisticated executive mood — warm, confident and aspirational, like a high-rise corner office at sunset. Polished and refined. Consistent with the Lenovo Idea Tab Pro "Create More, Achieve More" color and lighting identity.
Add: Subtle depth of field, Soft ambient glow
SUBJECT TREATMENT: Keep the subject recognizable, make it stand out and the focus point. Keep the original person recognizable.
IMPORTANT: Preserve facial identity, Natural skin texture, Realistic photography look, No AI-generated face appearance, No excessive beauty filter, No plastic skin, No exaggerated facial features, No cartoon effect
Enhance: Natural lighting, Subject visibility, Sharpness, Contrast, Subject separation from background
HEADLINE: {{HEADLINE}}
TYPOGRAPHY: A confident, elegant bold sans-serif for the main headline text in white or warm brown, paired with a refined thin-weight italic accent style for any secondary tagline text in warm brown or gold — premium, executive and aspirational. DEVICE TAG: place a small uppercase label reading "IDEA TAB PRO" fixed in the top-left corner of the frame, in white or warm brown to match this theme's palette — present consistently in every generation of this theme, independent of the headline.
COMPOSITION: Visual hierarchy: Subject Headline Background. Maintain clear spacing. Avoid clutter. Keep the layout balanced. Ensure readability on mobile screens.
LIGHTING: Commercial advertising photography. Use: Warm golden-hour highlights, Soft directional sunset light, Premium executive mood, cinematic warm glow
STYLE REFERENCE: Official Lenovo Idea Tab Pro "Create More, Achieve More" premium social media campaign, TikTok viral thumbnail, Modern tech advertising, High CTR design
QUALITY: Ultra realistic, Commercial photography, Premium advertising quality, Sharp focus, Consistent Lenovo Idea Tab Pro branding, 1080x1440`,
      get openai() { return this.gemini } } },
    },
  },
  {
    id: 'motopad-60-lite',
    label: 'MotoPad 60 Lite',
    tagline: 'Fun Made Easy',
    variants: {
      SP: { id: 'lenovo-motopad-60-lite-sp', templates: { gemini:
`You are a professional advertising designer creating a premium TikTok thumbnail for Lenovo MotoPad 60 Lite.
INPUTS: Cover photo (talent + product) + Background reference image
Headline text OBJECTIVE: Transform the cover photo into a premium, high-CTR TikTok thumbnail while maintaining a consistent MotoPad 60 Lite "Fun Made Easy" visual identity across all content.
OUTPUT SIZE: 1080 x 1440 px Vertical format TikTok optimized
BACKGROUND: Use the uploaded background reference as the actual visual environment for this shot — it is the real backdrop, not a mood board to be replaced or ignored. Keep its own content, layout and composition intact; render it as a natural, photographically real scene (never a flat illustration/clip-art copy). Grade its lighting, shadows and color palette toward the MotoPad 60 Lite "Fun Made Easy" identity below.
Maintain: a clean, bright color grade of soft sky-blue walls and crisp white daylight tones, lifted by gentle natural window-light and soft shadow patterns, as the dominant color story across the whole image.
Background characteristics: Clean, calm and easygoing mood — minimal, cheerful and light-filled, like a sunlit blue study nook. Premium and polished. Consistent with the MotoPad 60 Lite "Fun Made Easy" color and lighting identity.
Add: Subtle depth of field, Soft ambient glow
SUBJECT TREATMENT: Keep both the subject/talent and the product recognizable, make them stand out together as the focus point. Keep the original person and the product recognizable.
IMPORTANT: Preserve facial and product identity. Preserve facial identity, Natural skin texture, Realistic photography look, No AI-generated face appearance, No excessive beauty filter, No plastic skin, No exaggerated facial features, No cartoon effect. Preserve the product's exact shape, packaging, color, branding and markings — no invented or altered product details.
Enhance: Natural lighting, Subject visibility, Product visibility, Sharpness, Contrast, Subject separation from background
HEADLINE: {{HEADLINE}}
TYPOGRAPHY: A friendly, chunky rounded bold sans-serif for the main headline text in white or dark blue, paired with a playful cursive/script accent style for any secondary tagline text in dark blue — casual, light-hearted and easy to read. DEVICE TAG: place a small uppercase label reading "MOTOPAD 60 LITE" fixed in the top-left corner of the frame, in white or dark blue to match this theme's palette — present consistently in every generation of this theme, independent of the headline.
COMPOSITION: Visual hierarchy: Subject Product Headline Background. Maintain clear spacing. Avoid clutter. Keep the layout balanced. Ensure readability on mobile screens.
LIGHTING: Commercial advertising photography. Use: Soft natural window light, Gentle shadow patterns, Clean bright mood, crisp daylight glow
STYLE REFERENCE: Official MotoPad 60 Lite "Fun Made Easy" premium social media campaign, TikTok viral thumbnail, Modern tech advertising, High CTR design
QUALITY: Ultra realistic, Commercial photography, Premium advertising quality, Sharp focus, Consistent MotoPad 60 Lite branding, 1080x1440`,
      get openai() { return this.gemini } } },
      P: { id: 'lenovo-motopad-60-lite-p', templates: { gemini:
`You are a professional advertising designer creating a premium TikTok thumbnail for Lenovo MotoPad 60 Lite.
INPUTS: Cover photo (product) + Background reference image. No people in frame.
Headline text OBJECTIVE: Transform the cover photo into a premium, high-CTR TikTok thumbnail while maintaining a consistent MotoPad 60 Lite "Fun Made Easy" visual identity across all content.
OUTPUT SIZE: 1080 x 1440 px Vertical format TikTok optimized
BACKGROUND: Use the uploaded background reference as the actual visual environment for this shot — it is the real backdrop, not a mood board to be replaced or ignored. Keep its own content, layout and composition intact; render it as a natural, photographically real scene (never a flat illustration/clip-art copy). Grade its lighting, shadows and color palette toward the MotoPad 60 Lite "Fun Made Easy" identity below.
Maintain: a clean, bright color grade of soft sky-blue walls and crisp white daylight tones, lifted by gentle natural window-light and soft shadow patterns, as the dominant color story across the whole image.
Background characteristics: Clean, calm and easygoing mood — minimal, cheerful and light-filled, like a sunlit blue study nook. Premium and polished. Consistent with the MotoPad 60 Lite "Fun Made Easy" color and lighting identity.
Add: Subtle depth of field, Soft ambient glow
SUBJECT TREATMENT: The product is the sole subject and absolute focus point of the image. Do NOT include any people, talent, hands, or human presence anywhere in the frame — product only. Keep the product recognizable and standing out as the hero of the shot.
IMPORTANT: Preserve product identity exactly. Preserve the product's exact shape, packaging, color, branding and markings. Realistic photography look, No AI-generated distortion, No cartoon effect, No invented or altered product details.
Enhance: Natural lighting, Product visibility, Sharpness, Contrast, Subject separation from background
HEADLINE: {{HEADLINE}}
TYPOGRAPHY: A friendly, chunky rounded bold sans-serif for the main headline text in white or dark blue, paired with a playful cursive/script accent style for any secondary tagline text in dark blue — casual, light-hearted and easy to read. DEVICE TAG: place a small uppercase label reading "MOTOPAD 60 LITE" fixed in the top-left corner of the frame, in white or dark blue to match this theme's palette — present consistently in every generation of this theme, independent of the headline.
COMPOSITION: Visual hierarchy: Product Headline Background. Maintain clear spacing. Avoid clutter. Keep the layout balanced. Ensure readability on mobile screens.
LIGHTING: Commercial advertising photography. Use: Soft natural window light, Gentle shadow patterns, Clean bright mood, crisp daylight glow
STYLE REFERENCE: Official MotoPad 60 Lite "Fun Made Easy" premium social media campaign, TikTok viral thumbnail, Modern tech advertising, High CTR design
QUALITY: Ultra realistic, Commercial photography, Premium advertising quality, Sharp focus, Consistent MotoPad 60 Lite branding, 1080x1440`,
      get openai() { return this.gemini } } },
      S: { id: 'lenovo-motopad-60-lite-s', templates: { gemini:
`You are a professional advertising designer creating a premium TikTok thumbnail for Lenovo MotoPad 60 Lite.
INPUTS: Cover photo (talent/subject) + Background reference image
Headline text OBJECTIVE: Transform the cover photo into a premium, high-CTR TikTok thumbnail while maintaining a consistent MotoPad 60 Lite "Fun Made Easy" visual identity across all content.
OUTPUT SIZE: 1080 x 1440 px Vertical format TikTok optimized
BACKGROUND: Use the uploaded background reference as the actual visual environment for this shot — it is the real backdrop, not a mood board to be replaced or ignored. Keep its own content, layout and composition intact; render it as a natural, photographically real scene (never a flat illustration/clip-art copy). Grade its lighting, shadows and color palette toward the MotoPad 60 Lite "Fun Made Easy" identity below.
Maintain: a clean, bright color grade of soft sky-blue walls and crisp white daylight tones, lifted by gentle natural window-light and soft shadow patterns, as the dominant color story across the whole image.
Background characteristics: Clean, calm and easygoing mood — minimal, cheerful and light-filled, like a sunlit blue study nook. Premium and polished. Consistent with the MotoPad 60 Lite "Fun Made Easy" color and lighting identity.
Add: Subtle depth of field, Soft ambient glow
SUBJECT TREATMENT: Keep the subject recognizable, make it stand out and the focus point. Keep the original person recognizable.
IMPORTANT: Preserve facial identity, Natural skin texture, Realistic photography look, No AI-generated face appearance, No excessive beauty filter, No plastic skin, No exaggerated facial features, No cartoon effect
Enhance: Natural lighting, Subject visibility, Sharpness, Contrast, Subject separation from background
HEADLINE: {{HEADLINE}}
TYPOGRAPHY: A friendly, chunky rounded bold sans-serif for the main headline text in white or dark blue, paired with a playful cursive/script accent style for any secondary tagline text in dark blue — casual, light-hearted and easy to read. DEVICE TAG: place a small uppercase label reading "MOTOPAD 60 LITE" fixed in the top-left corner of the frame, in white or dark blue to match this theme's palette — present consistently in every generation of this theme, independent of the headline.
COMPOSITION: Visual hierarchy: Subject Headline Background. Maintain clear spacing. Avoid clutter. Keep the layout balanced. Ensure readability on mobile screens.
LIGHTING: Commercial advertising photography. Use: Soft natural window light, Gentle shadow patterns, Clean bright mood, crisp daylight glow
STYLE REFERENCE: Official MotoPad 60 Lite "Fun Made Easy" premium social media campaign, TikTok viral thumbnail, Modern tech advertising, High CTR design
QUALITY: Ultra realistic, Commercial photography, Premium advertising quality, Sharp focus, Consistent MotoPad 60 Lite branding, 1080x1440`,
      get openai() { return this.gemini } } },
    },
  },
  {
    id: 'motopad-60-neo',
    label: 'MotoPad 60 Neo',
    tagline: 'Good Days, Every Day',
    variants: {
      SP: { id: 'lenovo-motopad-60-neo-sp', templates: { gemini:
`You are a professional advertising designer creating a premium TikTok thumbnail for Lenovo MotoPad 60 Neo.
INPUTS: Cover photo (talent + product) + Background reference image
Headline text OBJECTIVE: Transform the cover photo into a premium, high-CTR TikTok thumbnail while maintaining a consistent MotoPad 60 Neo "Good Days, Every Day" visual identity across all content.
OUTPUT SIZE: 1080 x 1440 px Vertical format TikTok optimized
BACKGROUND: Use the uploaded background reference as the actual visual environment for this shot — it is the real backdrop, not a mood board to be replaced or ignored. Keep its own content, layout and composition intact; render it as a natural, photographically real scene (never a flat illustration/clip-art copy). Grade its lighting, shadows and color palette toward the MotoPad 60 Neo "Good Days, Every Day" identity below.
Maintain: a moody deep-blue color grade of dark navy shadows, lifted by a warm amber lamp-glow accent, as the dominant color story across the whole image.
Background characteristics: Calm, intimate and cozy evening mood — quiet, focused and warmly lit, like a peaceful nighttime study nook. Premium and polished. Consistent with the MotoPad 60 Neo "Good Days, Every Day" color and lighting identity.
Add: Subtle depth of field, Soft ambient glow
SUBJECT TREATMENT: Keep both the subject/talent and the product recognizable, make them stand out together as the focus point. Keep the original person and the product recognizable.
IMPORTANT: Preserve facial and product identity. Preserve facial identity, Natural skin texture, Realistic photography look, No AI-generated face appearance, No excessive beauty filter, No plastic skin, No exaggerated facial features, No cartoon effect. Preserve the product's exact shape, packaging, color, branding and markings — no invented or altered product details.
Enhance: Natural lighting, Subject visibility, Product visibility, Sharpness, Contrast, Subject separation from background
HEADLINE: {{HEADLINE}}
TYPOGRAPHY: A clean, rounded bold sans-serif for the main headline text in white or soft blue, paired with a relaxed handwritten-style script accent for any secondary tagline text in soft blue — calm, cozy and inviting. DEVICE TAG: place a small uppercase label reading "MOTOPAD 60 NEO" fixed in the top-left corner of the frame, in white or soft blue to match this theme's palette — present consistently in every generation of this theme, independent of the headline.
COMPOSITION: Visual hierarchy: Subject Product Headline Background. Maintain clear spacing. Avoid clutter. Keep the layout balanced. Ensure readability on mobile screens.
LIGHTING: Commercial advertising photography. Use: Warm lamp-glow highlights, Deep ambient shadows, Calm cozy mood, quiet nighttime glow
STYLE REFERENCE: Official MotoPad 60 Neo "Good Days, Every Day" premium social media campaign, TikTok viral thumbnail, Modern tech advertising, High CTR design
QUALITY: Ultra realistic, Commercial photography, Premium advertising quality, Sharp focus, Consistent MotoPad 60 Neo branding, 1080x1440`,
      get openai() { return this.gemini } } },
      P: { id: 'lenovo-motopad-60-neo-p', templates: { gemini:
`You are a professional advertising designer creating a premium TikTok thumbnail for Lenovo MotoPad 60 Neo.
INPUTS: Cover photo (product) + Background reference image. No people in frame.
Headline text OBJECTIVE: Transform the cover photo into a premium, high-CTR TikTok thumbnail while maintaining a consistent MotoPad 60 Neo "Good Days, Every Day" visual identity across all content.
OUTPUT SIZE: 1080 x 1440 px Vertical format TikTok optimized
BACKGROUND: Use the uploaded background reference as the actual visual environment for this shot — it is the real backdrop, not a mood board to be replaced or ignored. Keep its own content, layout and composition intact; render it as a natural, photographically real scene (never a flat illustration/clip-art copy). Grade its lighting, shadows and color palette toward the MotoPad 60 Neo "Good Days, Every Day" identity below.
Maintain: a moody deep-blue color grade of dark navy shadows, lifted by a warm amber lamp-glow accent, as the dominant color story across the whole image.
Background characteristics: Calm, intimate and cozy evening mood — quiet, focused and warmly lit, like a peaceful nighttime study nook. Premium and polished. Consistent with the MotoPad 60 Neo "Good Days, Every Day" color and lighting identity.
Add: Subtle depth of field, Soft ambient glow
SUBJECT TREATMENT: The product is the sole subject and absolute focus point of the image. Do NOT include any people, talent, hands, or human presence anywhere in the frame — product only. Keep the product recognizable and standing out as the hero of the shot.
IMPORTANT: Preserve product identity exactly. Preserve the product's exact shape, packaging, color, branding and markings. Realistic photography look, No AI-generated distortion, No cartoon effect, No invented or altered product details.
Enhance: Natural lighting, Product visibility, Sharpness, Contrast, Subject separation from background
HEADLINE: {{HEADLINE}}
TYPOGRAPHY: A clean, rounded bold sans-serif for the main headline text in white or soft blue, paired with a relaxed handwritten-style script accent for any secondary tagline text in soft blue — calm, cozy and inviting. DEVICE TAG: place a small uppercase label reading "MOTOPAD 60 NEO" fixed in the top-left corner of the frame, in white or soft blue to match this theme's palette — present consistently in every generation of this theme, independent of the headline.
COMPOSITION: Visual hierarchy: Product Headline Background. Maintain clear spacing. Avoid clutter. Keep the layout balanced. Ensure readability on mobile screens.
LIGHTING: Commercial advertising photography. Use: Warm lamp-glow highlights, Deep ambient shadows, Calm cozy mood, quiet nighttime glow
STYLE REFERENCE: Official MotoPad 60 Neo "Good Days, Every Day" premium social media campaign, TikTok viral thumbnail, Modern tech advertising, High CTR design
QUALITY: Ultra realistic, Commercial photography, Premium advertising quality, Sharp focus, Consistent MotoPad 60 Neo branding, 1080x1440`,
      get openai() { return this.gemini } } },
      S: { id: 'lenovo-motopad-60-neo-s', templates: { gemini:
`You are a professional advertising designer creating a premium TikTok thumbnail for Lenovo MotoPad 60 Neo.
INPUTS: Cover photo (talent/subject) + Background reference image
Headline text OBJECTIVE: Transform the cover photo into a premium, high-CTR TikTok thumbnail while maintaining a consistent MotoPad 60 Neo "Good Days, Every Day" visual identity across all content.
OUTPUT SIZE: 1080 x 1440 px Vertical format TikTok optimized
BACKGROUND: Use the uploaded background reference as the actual visual environment for this shot — it is the real backdrop, not a mood board to be replaced or ignored. Keep its own content, layout and composition intact; render it as a natural, photographically real scene (never a flat illustration/clip-art copy). Grade its lighting, shadows and color palette toward the MotoPad 60 Neo "Good Days, Every Day" identity below.
Maintain: a moody deep-blue color grade of dark navy shadows, lifted by a warm amber lamp-glow accent, as the dominant color story across the whole image.
Background characteristics: Calm, intimate and cozy evening mood — quiet, focused and warmly lit, like a peaceful nighttime study nook. Premium and polished. Consistent with the MotoPad 60 Neo "Good Days, Every Day" color and lighting identity.
Add: Subtle depth of field, Soft ambient glow
SUBJECT TREATMENT: Keep the subject recognizable, make it stand out and the focus point. Keep the original person recognizable.
IMPORTANT: Preserve facial identity, Natural skin texture, Realistic photography look, No AI-generated face appearance, No excessive beauty filter, No plastic skin, No exaggerated facial features, No cartoon effect
Enhance: Natural lighting, Subject visibility, Sharpness, Contrast, Subject separation from background
HEADLINE: {{HEADLINE}}
TYPOGRAPHY: A clean, rounded bold sans-serif for the main headline text in white or soft blue, paired with a relaxed handwritten-style script accent for any secondary tagline text in soft blue — calm, cozy and inviting. DEVICE TAG: place a small uppercase label reading "MOTOPAD 60 NEO" fixed in the top-left corner of the frame, in white or soft blue to match this theme's palette — present consistently in every generation of this theme, independent of the headline.
COMPOSITION: Visual hierarchy: Subject Headline Background. Maintain clear spacing. Avoid clutter. Keep the layout balanced. Ensure readability on mobile screens.
LIGHTING: Commercial advertising photography. Use: Warm lamp-glow highlights, Deep ambient shadows, Calm cozy mood, quiet nighttime glow
STYLE REFERENCE: Official MotoPad 60 Neo "Good Days, Every Day" premium social media campaign, TikTok viral thumbnail, Modern tech advertising, High CTR design
QUALITY: Ultra realistic, Commercial photography, Premium advertising quality, Sharp focus, Consistent MotoPad 60 Neo branding, 1080x1440`,
      get openai() { return this.gemini } } },
    },
  },
  {
    id: 'motopad-60-pro',
    label: 'MotoPad 60 Pro',
    tagline: 'Bold Days, Best You',
    variants: {
      SP: { id: 'lenovo-motopad-60-pro-sp', templates: { gemini:
`You are a professional advertising designer creating a premium TikTok thumbnail for Lenovo MotoPad 60 Pro.
INPUTS: Cover photo (talent + product) + Background reference image
Headline text OBJECTIVE: Transform the cover photo into a premium, high-CTR TikTok thumbnail while maintaining a consistent MotoPad 60 Pro "Bold Days, Best You" visual identity across all content.
OUTPUT SIZE: 1080 x 1440 px Vertical format TikTok optimized
BACKGROUND: Use the uploaded background reference as the actual visual environment for this shot — it is the real backdrop, not a mood board to be replaced or ignored. Keep its own content, layout and composition intact; render it as a natural, photographically real scene (never a flat illustration/clip-art copy). Grade its lighting, shadows and color palette toward the MotoPad 60 Pro "Bold Days, Best You" identity below.
Maintain: a moody, high-contrast color grade of deep charcoal-black shadows with vivid neon-green RGB accent lighting and cool blue-black night tones, as the dominant color story across the whole image.
Background characteristics: Moody, sophisticated and high-tech mood — sleek, minimalist and premium, like a late-night gamer/creator battlestation. Consistent with the MotoPad 60 Pro "Bold Days, Best You" color and lighting identity.
Add: Subtle depth of field, Soft ambient glow
SUBJECT TREATMENT: Keep both the subject/talent and the product recognizable, make them stand out together as the focus point. Keep the original person and the product recognizable.
IMPORTANT: Preserve facial and product identity. Preserve facial identity, Natural skin texture, Realistic photography look, No AI-generated face appearance, No excessive beauty filter, No plastic skin, No exaggerated facial features, No cartoon effect. Preserve the product's exact shape, packaging, color, branding and markings — no invented or altered product details.
Enhance: Natural lighting, Subject visibility, Product visibility, Sharpness, Contrast, Subject separation from background
HEADLINE: {{HEADLINE}}
TYPOGRAPHY: A bold, sharp-edged modern sans-serif for the main headline text in bright white or vivid neon green with a subtle glowing edge, paired with a clean technical accent style for any secondary tagline text in vivid neon green — sleek, moody and high-tech. DEVICE TAG: place a small uppercase label reading "MOTOPAD 60 PRO" fixed in the top-left corner of the frame, in white or vivid neon green to match this theme's palette — present consistently in every generation of this theme, independent of the headline.
COMPOSITION: Visual hierarchy: Subject Product Headline Background. Maintain clear spacing. Avoid clutter. Keep the layout balanced. Ensure readability on mobile screens.
LIGHTING: Commercial advertising photography. Use: Low-key ambient highlights, Deep natural shadows, Moody dramatic mood, night-time RGB gaming-setup lighting
STYLE REFERENCE: Official MotoPad 60 Pro "Bold Days, Best You" premium social media campaign, TikTok viral thumbnail, Modern tech advertising, High CTR design
QUALITY: Ultra realistic, Commercial photography, Premium advertising quality, Sharp focus, Consistent MotoPad 60 Pro branding, 1080x1440`,
      get openai() { return this.gemini } } },
      P: { id: 'lenovo-motopad-60-pro-p', templates: { gemini:
`You are a professional advertising designer creating a premium TikTok thumbnail for Lenovo MotoPad 60 Pro.
INPUTS: Cover photo (product) + Background reference image. No people in frame.
Headline text OBJECTIVE: Transform the cover photo into a premium, high-CTR TikTok thumbnail while maintaining a consistent MotoPad 60 Pro "Bold Days, Best You" visual identity across all content.
OUTPUT SIZE: 1080 x 1440 px Vertical format TikTok optimized
BACKGROUND: Use the uploaded background reference as the actual visual environment for this shot — it is the real backdrop, not a mood board to be replaced or ignored. Keep its own content, layout and composition intact; render it as a natural, photographically real scene (never a flat illustration/clip-art copy). Grade its lighting, shadows and color palette toward the MotoPad 60 Pro "Bold Days, Best You" identity below.
Maintain: a moody, high-contrast color grade of deep charcoal-black shadows with vivid neon-green RGB accent lighting and cool blue-black night tones, as the dominant color story across the whole image.
Background characteristics: Moody, sophisticated and high-tech mood — sleek, minimalist and premium, like a late-night gamer/creator battlestation. Consistent with the MotoPad 60 Pro "Bold Days, Best You" color and lighting identity.
Add: Subtle depth of field, Soft ambient glow
SUBJECT TREATMENT: The product is the sole subject and absolute focus point of the image. Do NOT include any people, talent, hands, or human presence anywhere in the frame — product only. Keep the product recognizable and standing out as the hero of the shot.
IMPORTANT: Preserve product identity exactly. Preserve the product's exact shape, packaging, color, branding and markings. Realistic photography look, No AI-generated distortion, No cartoon effect, No invented or altered product details.
Enhance: Natural lighting, Product visibility, Sharpness, Contrast, Subject separation from background
HEADLINE: {{HEADLINE}}
TYPOGRAPHY: A bold, sharp-edged modern sans-serif for the main headline text in bright white or vivid neon green with a subtle glowing edge, paired with a clean technical accent style for any secondary tagline text in vivid neon green — sleek, moody and high-tech. DEVICE TAG: place a small uppercase label reading "MOTOPAD 60 PRO" fixed in the top-left corner of the frame, in white or vivid neon green to match this theme's palette — present consistently in every generation of this theme, independent of the headline.
COMPOSITION: Visual hierarchy: Product Headline Background. Maintain clear spacing. Avoid clutter. Keep the layout balanced. Ensure readability on mobile screens.
LIGHTING: Commercial advertising photography. Use: Low-key ambient highlights, Deep natural shadows, Moody dramatic mood, night-time RGB gaming-setup lighting
STYLE REFERENCE: Official MotoPad 60 Pro "Bold Days, Best You" premium social media campaign, TikTok viral thumbnail, Modern tech advertising, High CTR design
QUALITY: Ultra realistic, Commercial photography, Premium advertising quality, Sharp focus, Consistent MotoPad 60 Pro branding, 1080x1440`,
      get openai() { return this.gemini } } },
      S: { id: 'lenovo-motopad-60-pro-s', templates: { gemini:
`You are a professional advertising designer creating a premium TikTok thumbnail for Lenovo MotoPad 60 Pro.
INPUTS: Cover photo (talent/subject) + Background reference image
Headline text OBJECTIVE: Transform the cover photo into a premium, high-CTR TikTok thumbnail while maintaining a consistent MotoPad 60 Pro "Bold Days, Best You" visual identity across all content.
OUTPUT SIZE: 1080 x 1440 px Vertical format TikTok optimized
BACKGROUND: Use the uploaded background reference as the actual visual environment for this shot — it is the real backdrop, not a mood board to be replaced or ignored. Keep its own content, layout and composition intact; render it as a natural, photographically real scene (never a flat illustration/clip-art copy). Grade its lighting, shadows and color palette toward the MotoPad 60 Pro "Bold Days, Best You" identity below.
Maintain: a moody, high-contrast color grade of deep charcoal-black shadows with vivid neon-green RGB accent lighting and cool blue-black night tones, as the dominant color story across the whole image.
Background characteristics: Moody, sophisticated and high-tech mood — sleek, minimalist and premium, like a late-night gamer/creator battlestation. Consistent with the MotoPad 60 Pro "Bold Days, Best You" color and lighting identity.
Add: Subtle depth of field, Soft ambient glow
SUBJECT TREATMENT: Keep the subject recognizable, make it stand out and the focus point. Keep the original person recognizable.
IMPORTANT: Preserve facial identity, Natural skin texture, Realistic photography look, No AI-generated face appearance, No excessive beauty filter, No plastic skin, No exaggerated facial features, No cartoon effect
Enhance: Natural lighting, Subject visibility, Sharpness, Contrast, Subject separation from background
HEADLINE: {{HEADLINE}}
TYPOGRAPHY: A bold, sharp-edged modern sans-serif for the main headline text in bright white or vivid neon green with a subtle glowing edge, paired with a clean technical accent style for any secondary tagline text in vivid neon green — sleek, moody and high-tech. DEVICE TAG: place a small uppercase label reading "MOTOPAD 60 PRO" fixed in the top-left corner of the frame, in white or vivid neon green to match this theme's palette — present consistently in every generation of this theme, independent of the headline.
COMPOSITION: Visual hierarchy: Subject Headline Background. Maintain clear spacing. Avoid clutter. Keep the layout balanced. Ensure readability on mobile screens.
LIGHTING: Commercial advertising photography. Use: Low-key ambient highlights, Deep natural shadows, Moody dramatic mood, night-time RGB gaming-setup lighting
STYLE REFERENCE: Official MotoPad 60 Pro "Bold Days, Best You" premium social media campaign, TikTok viral thumbnail, Modern tech advertising, High CTR design
QUALITY: Ultra realistic, Commercial photography, Premium advertising quality, Sharp focus, Consistent MotoPad 60 Pro branding, 1080x1440`,
      get openai() { return this.gemini } } },
    },
  },
]

// Flat set of every themed preset id, so the Lenovo brand button can still
// show its "✓ active" checkmark when a themed S/SP/P (rather than a plain
// Lenovo-SP/Lenovo-P) preset is the one currently applied.
const LENOVO_THEME_PRESET_IDS = new Set(
  LENOVO_THEMES.flatMap(theme => Object.values(theme.variants).map(v => v.id))
)

// ── Debs Themes ──────────────────────────────────────────────
// A brand with NO direct SP/P presets of its own — "Themes" is its only
// option at the brand level (unlike Lenovo, which has plain SP/P plus
// Themes). Currently just one theme, "Billboard" (S/Subject only); more can
// be appended to this array later the same way the Lenovo lineups were.
const DEBS_THEMES = [
  {
    id: 'billboard',
    label: 'Billboard',
    tagline: '',
    variants: {
      S: { id: 'debs-billboard-s', templates: { gemini:
`You are a professional advertising designer creating a premium TikTok thumbnail.
INPUTS: Cover photo product + Background reference image (replace the product's background with the background reference image)
Headline text OBJECTIVE: Transform the cover photo into a premium, high-CTR TikTok thumbnail while maintaining a consistent visual identity across all content.
OUTPUT SIZE: 1080 x 1440 px Vertical format TikTok optimized
BACKGROUND: Use the uploaded background reference, replace the product's current background with the uploaded background reference and make it natural.
Maintain: Overall color palette, Gradient direction, Lighting, atmosphere, Visual mood
Background characteristics: Create a natural look integrating the background, ensuring the talent's face is clear and bright; add a raised, colorful effect beside or in front of the talent without obscuring them. The talent is placed to the right side of the Billboard
Add: Subtle depth of field Light bokeh particles Soft ambient glow. The Billboard is themed with subtle pink, purple, and white colour themes.
SUBJECT TREATMENT: Keep the Billboard and subject recognizable, make it stand out and the focus point. Keep the original person recognizable. The Subjects are placed to the right side of the Billboard
IMPORTANT: Preserve facial and product identity. Preserve facial identity, Natural skin texture, Realistic photography look, No AI-generated face appearance, No excessive beauty filter, No plastic skin, No exaggerated facial features, No cartoon effect,  No cartoon effect
Enhance: Natural lighting Product visibility Sharpness Contrast Product
HEADLINE: {{HEADLINE}}
IMPORTANT: THE HEADLINE IS PLACED INSIDE THE BILLBOARD.
TYPOGRAPHY: Premium viral Indonesian social media typography.
Large bold rounded sans-serif font, similar to TikTok and YouTube Shorts thumbnails.
Friendly, youthful, highly readable on mobile screens.
Mixed font weights:
- Main keywords ultra bold
- Supporting words medium weight
Text layout optimized for fast scanning within 1 second.
Thick white stroke outline (8-12px)
Soft dark drop shadow
Slight 3D depth
High contrast against background
Important keywords highlighted using bright accent colors.
Typography should feel:
- modern
- casual
- relatable
- energetic
- social-media native
Text spacing balanced and professional.
Indonesian viral content style.
CTR-optimized thumbnail typography.
Premium advertising quality.
Visual hierarchy: Subject Headline Background
Maintain clear spacing. Avoid clutter. Keep the layout balanced. Ensure readability on mobile screens.
LIGHTING: Commercial advertising photography. Use: Soft premium highlights Natural shadows Bright educational mood, casual and youthful energy
QUALITY: Ultra realistic Commercial photography Premium advertising quality Sharp focus 1080x1440`,
      get openai() { return this.gemini } } },
    },
  },
]

const DEBS_THEME_PRESET_IDS = new Set(
  DEBS_THEMES.flatMap(theme => Object.values(theme.variants).map(v => v.id))
)

// Maps a brand's `id` (as used by PRESET_GROUPS / activeBrandId) to its
// Themes drill-down data, if it has one. Generalizes the Lenovo Themes UI so
// any brand — with or without its own plain SP/P presets — can plug in a
// Themes option the same way. Add new themed brands here.
const BRAND_THEME_CONFIG = {
  lenovo: { themes: LENOVO_THEMES, ids: LENOVO_THEME_PRESET_IDS },
  debs:   { themes: DEBS_THEMES,   ids: DEBS_THEME_PRESET_IDS },
}

// Grouped view of PRESETS for the two-level Brand Presets UI below — pick a
// brand first (Lenovo / Universal / LEGO), then a version (SP / P / S), so
// the button row doesn't grow unbounded as more brands/versions get added.
// Derived from `preset.brand` (e.g. "Lenovo-SP") rather than a second copy
// of the data, so PRESETS above stays the single source of truth.
const PRESET_GROUPS = (() => {
  const variantOrder = { SP: 0, P: 1, S: 2 }
  const groups = []
  const byBrand = {}
  for (const preset of PRESETS) {
    const [brandName, variant] = preset.brand.split('-')
    if (!byBrand[brandName]) {
      byBrand[brandName] = { id: brandName.toLowerCase(), brand: brandName, variants: [] }
      groups.push(byBrand[brandName])
    }
    byBrand[brandName].variants.push({ ...preset, variant })
  }
  groups.forEach(g => g.variants.sort((a, b) => (variantOrder[a.variant] ?? 9) - (variantOrder[b.variant] ?? 9)))
  // Debs has no flat SP/P presets in PRESETS above — Themes is its only
  // option — so it needs to be injected directly rather than derived.
  groups.push({ id: 'debs', brand: 'Debs', variants: [] })
  return groups
})()

export default function ThumbnailCreator() {
  const { addToHistory } = useHistory()
  const { showToast } = useToast()

  const [bgImage, setBgImage]     = useState(null)   // { file, preview } — campaign background
  const [baseImage, setBaseImage] = useState(null)   // { file, preview } — talent photo
  // "Multiple Product Reference" — off by default. When on, the single
  // Subject / Product Reference box below is replaced by up to 4 optional
  // product slots, for presets (like LEGO MultiP) that merge several
  // products into one shot. The first filled slot becomes `base_image`
  // (same as today); any additional filled slots ride along as
  // `extra_product_images`.
  const [useMultiProduct, setUseMultiProduct] = useState(false)
  const [productImages, setProductImages] = useState([null, null, null, null])

  function setProductImageAt(i, value) {
    setProductImages(prev => prev.map((v, idx) => (idx === i ? value : v)))
  }
  const [headline, setHeadline]   = useState('')
  const [notes, setNotes]         = useState('')
  const [presetPrompt, setPresetPrompt]     = useState('')   // filled preset text, overrides notes when set
  const [activePresetId, setActivePresetId] = useState(null)
  const [preserveFace, setPreserveFace]     = useState(false) // off by default — appends a modular face/subject identity-lock instruction on top of whatever prompt (preset or notes) is sent
  const [activeBrandId, setActiveBrandId]   = useState(null) // which Brand Presets group is expanded
  const [activeThemeId, setActiveThemeId]   = useState(null) // Lenovo only — which of the 6 Themes is expanded (shows its S/SP/P row)
  const [result, setResult]       = useState(null)
  const [loading, setLoading]     = useState(false)
  const [showPrompt, setShowPrompt] = useState(false)
  // Default provider is OpenAI at Low quality with enrichment off — the
  // lowest-cost combination — since Gemini and High quality are locked below
  // to control spend. Flip GEMINI_LOCKED/HIGH_QUALITY_LOCKED above to
  // re-enable either once you're ready.
  const [provider, setProvider]   = useState('openai')   // 'gemini' | 'openai'
  const [quality, setQuality]     = useState('low')       // OpenAI only: 'low' | 'medium' | 'high'
  const [enrichPrompt, setEnrichPrompt] = useState(false)  // OpenAI only: ChatGPT-style prompt rewrite on/off

  function handleApplyPreset(preset) {
    if (!headline.trim()) {
      showToast('Please type the Headline first, then apply a brand preset.')
      return
    }
    const tpl = preset.templates[provider] || preset.templates.gemini
    const filled = tpl.replace('{{HEADLINE}}', headline.trim())
    setPresetPrompt(filled)
    setActivePresetId(preset.id)
  }

  function handleClearPreset() {
    setPresetPrompt('')
    setActivePresetId(null)
  }

  async function handleGenerate() {
    // In Multiple Product Reference mode, the first filled product slot
    // stands in for the usual single Subject / Product Reference upload;
    // any further filled slots go along as extra product images.
    const primaryProductFile = useMultiProduct ? productImages[0]?.file : baseImage?.file
    if (!primaryProductFile) { showToast('Please upload the Subject / Product Reference photo.'); return }
    if (!bgImage?.file)  { showToast('Please upload the Mood & Style Reference photo.'); return }
    if (!headline.trim()) { showToast('Please enter the Headline text.'); return }
    setLoading(true)
    setResult(null)
    setShowPrompt(false)

    const fd = new FormData()
    fd.append('headline', headline)
    fd.append('provider', provider)
    if (provider === 'openai') {
      fd.append('quality', quality)
      fd.append('enrich_prompt', enrichPrompt ? '1' : '0')
    }
    fd.append('preserve_face', preserveFace ? '1' : '0')
    fd.append('background_image', bgImage.file)
    fd.append('base_image', primaryProductFile)
    if (useMultiProduct) {
      productImages.slice(1).forEach(img => { if (img?.file) fd.append('extra_product_images', img.file) })
    }
    if (presetPrompt.trim()) {
      fd.append('custom_prompt', presetPrompt)
    } else {
      fd.append('notes', notes)
    }

    try {
      const res  = await fetch('/api/thumbnail', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Generation failed')

      const item = {
        id:       data.id,
        image:    data.image,
        label:    data.label,
        prompt:   data.prompt_used || '',
        provider: data.provider_used || provider,
        quality:  data.quality_used || null,
        enrichmentUsed:  data.enrichment_used ?? null,   // OpenAI only: true/false/null
        enrichmentError: data.enrichment_error || null,
        ratio:    '1080x1440',
        ts:       new Date().toLocaleTimeString(),
      }
      setResult(item)
      addToHistory(item)
    } catch (err) {
      showToast(err.message)
    } finally {
      setLoading(false)
    }
  }

  function downloadResult() {
    if (!result) return
    const a = document.createElement('a')
    a.href = `data:image/png;base64,${result.image}`
    a.download = `thumb_${result.id}.png`
    a.click()
  }

  function handleReset() {
    setBgImage(null)
    setBaseImage(null)
    setUseMultiProduct(false)
    setProductImages([null, null, null, null])
    setHeadline('')
    setNotes('')
    setPresetPrompt('')
    setActivePresetId(null)
    setActiveBrandId(null)
    setActiveThemeId(null)
    setPreserveFace(false)
    setResult(null)
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Thumbnail Creator</div>
        <div className="page-title-accent" />
        <div className="page-subtitle">
          Upload this month's campaign background and the talent's base photo, type the headline,
          and get a ready-to-use 1080×1440 thumbnail.
        </div>
      </div>

      <div className="two-col">
        {/* LEFT — Inputs */}
        <div>
          <div className="card">
            <div className="card-title">AI Provider</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn-secondary"
                disabled={GEMINI_LOCKED}
                title={GEMINI_LOCKED ? 'Gemini is temporarily locked to control costs.' : undefined}
                style={GEMINI_LOCKED
                  ? { opacity: 0.5, cursor: 'not-allowed' }
                  : (provider === 'gemini' ? { borderColor: 'var(--accent, #8b5cf6)' } : undefined)}
                onClick={() => !GEMINI_LOCKED && setProvider('gemini')}
              >
                {GEMINI_LOCKED ? '🔒 ' : provider === 'gemini' ? '✓ ' : ''}Gemini
              </button>
              <button
                className="btn-secondary"
                style={provider === 'openai' ? { borderColor: 'var(--accent, #8b5cf6)' } : undefined}
                onClick={() => setProvider('openai')}
              >
                {provider === 'openai' ? '✓ ' : ''}OpenAI
              </button>
            </div>

            {provider === 'openai' && (
              <div style={{ marginTop: 12 }}>
                <div className="form-label" style={{ marginBottom: 6 }}>Image Quality</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[
                    { key: 'low',    label: 'Low',    cost: '~$0.005/image' },
                    { key: 'medium', label: 'Medium', cost: '~$0.041/image' },
                    { key: 'high',   label: 'High',   cost: '~$0.165/image', locked: HIGH_QUALITY_LOCKED },
                  ].map(q => (
                    <button
                      key={q.key}
                      className="btn-secondary"
                      disabled={q.locked}
                      title={q.locked ? 'High quality is temporarily locked to control costs.' : undefined}
                      style={q.locked
                        ? { opacity: 0.5, cursor: 'not-allowed' }
                        : (quality === q.key ? { borderColor: 'var(--accent, #8b5cf6)' } : undefined)}
                      onClick={() => !q.locked && setQuality(q.key)}
                    >
                      {q.locked ? '🔒 ' : quality === q.key ? '✓ ' : ''}{q.label} <span style={{ opacity: 0.6, fontSize: 10 }}>{q.cost}</span>
                    </button>
                  ))}
                </div>

                <div style={{ marginTop: 14 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={enrichPrompt}
                      onChange={e => setEnrichPrompt(e.target.checked)}
                    />
                    <span className="form-label" style={{ margin: 0 }}>Enrich prompt (ChatGPT-style rewrite)</span>
                  </label>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6 }}>
                    {enrichPrompt
                      ? 'On: your preset is rewritten into a more vivid, concrete brief before it’s sent — mirrors what ChatGPT quietly does to every prompt you type there.'
                      : 'Off: sends your preset completely RAW and unmodified, exactly as written below — useful for comparing against the enriched version.'}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-title">
              <span className="step-badge">1</span>
              Reference Images
            </div>
            <div className="form-grid">
              <div>
                {!useMultiProduct ? (
                  <UploadBox
                    label="Subject / Product Reference"
                    hint="Who or what must stay recognizable"
                    icon="🧑"
                    image={baseImage}
                    onSelect={setBaseImage}
                    minHeight={150}
                    previewMaxHeight={150}
                  />
                ) : (
                  <div>
                    <div className="form-label" style={{ marginBottom: 6 }}>Product References</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {productImages.map((img, i) => (
                        <UploadBox
                          key={i}
                          label={`Product ${i + 1}`}
                          hint={i === 0 ? 'At least one product required' : 'Optional'}
                          icon="📦"
                          image={img}
                          onSelect={val => setProductImageAt(i, val)}
                          required={false}
                          minHeight={110}
                          previewMaxHeight={110}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ marginTop: 12 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={useMultiProduct}
                      onChange={e => setUseMultiProduct(e.target.checked)}
                    />
                    <span className="form-label" style={{ margin: 0 }}>Multiple Product Reference</span>
                  </label>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6 }}>
                    {useMultiProduct
                      ? 'On: upload up to 4 separate product photos — used with presets (like LEGO MultiP) that merge several products into one shot.'
                      : 'Off: uses a single Subject / Product Reference photo, as usual.'}
                  </div>
                </div>
              </div>

              <UploadBox
                label="Mood & Style Reference"
                hint="Colors, vibe, and creative direction to draw from"
                icon="🎨"
                image={bgImage}
                onSelect={setBgImage}
                minHeight={150}
                previewMaxHeight={150}
              />
            </div>
          </div>

          <div className="card">
            <div className="card-title">
              <span className="step-badge">2</span>
              Headline & Notes
            </div>

            <div className="form-group full" style={{ marginBottom: 14 }}>
              <label className="form-label">Headline *</label>
              <input
                className="form-input"
                placeholder="e.g. RAHASIA PEKERJA PRODUKTIF"
                value={headline}
                onChange={e => setHeadline(e.target.value)}
              />
            </div>

            {!presetPrompt && (
              <div className="form-group full">
                <label className="form-label">Notes (Optional)</label>
                <textarea
                  className="form-textarea"
                  placeholder="e.g. headline colorful & timbul di samping talent, tidak menutupi wajah…"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            )}

            <div style={{ marginTop: 14 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={preserveFace}
                  onChange={e => setPreserveFace(e.target.checked)}
                />
                <span className="form-label" style={{ margin: 0 }}>Lock face / subject identity</span>
              </label>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6 }}>
                {preserveFace
                  ? 'On: an extra instruction is added on top of the preset (or notes) prompt telling the AI to match the reference photo’s face exactly, instead of reinterpreting it each generation.'
                  : 'Off: only the preset/notes prompt is sent, as written below.'}
              </div>
            </div>

            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 10 }}>
              📐 Output ratio is fixed at <strong>1080×1440 (3:4)</strong>
            </div>
          </div>

          <div className="card">
            <div className="card-title">
              <span className="step-badge">3</span>
              Brand Presets
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 10 }}>
              Fill in the Headline above, then pick a brand and a version to auto-fill its full
              prompt below. Each version is tuned for the AI Provider selected above — if you
              switch providers after applying one, click the version again to load the matching one.
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {PRESET_GROUPS.map(group => {
                const themeConfig = BRAND_THEME_CONFIG[group.id]
                const groupHasActive = group.variants.some(v => v.id === activePresetId)
                  || (themeConfig && themeConfig.ids.has(activePresetId))
                return (
                  <button
                    key={group.id}
                    className="btn-secondary"
                    style={activeBrandId === group.id || groupHasActive ? { borderColor: 'var(--accent, #8b5cf6)' } : undefined}
                    onClick={() => {
                      setActiveBrandId(prev => (prev === group.id ? null : group.id))
                      setActiveThemeId(null)
                    }}
                  >
                    {groupHasActive ? '✓ ' : ''}{group.brand}
                  </button>
                )
              })}
            </div>

            {activeBrandId && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                {PRESET_GROUPS.find(g => g.id === activeBrandId)?.variants.map(v => (
                  <button
                    key={v.id}
                    className="btn-secondary"
                    style={activePresetId === v.id ? { borderColor: 'var(--accent, #8b5cf6)' } : undefined}
                    onClick={() => { handleApplyPreset(v); setActiveThemeId(null) }}
                  >
                    {activePresetId === v.id ? '✓ ' : ''}{v.variant}
                  </button>
                ))}
                {BRAND_THEME_CONFIG[activeBrandId] && (
                  <button
                    className="btn-secondary"
                    style={activeThemeId || BRAND_THEME_CONFIG[activeBrandId].ids.has(activePresetId) ? { borderColor: 'var(--accent, #8b5cf6)' } : undefined}
                    onClick={() => setActiveThemeId(prev => (prev ? null : BRAND_THEME_CONFIG[activeBrandId].themes[0].id))}
                  >
                    {BRAND_THEME_CONFIG[activeBrandId].ids.has(activePresetId) ? '✓ ' : ''}Themes
                  </button>
                )}
              </div>
            )}

            {activeBrandId && BRAND_THEME_CONFIG[activeBrandId] && activeThemeId && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                {BRAND_THEME_CONFIG[activeBrandId].themes.map(theme => {
                  const themeHasActive = Object.values(theme.variants).some(v => v.id === activePresetId)
                  return (
                    <button
                      key={theme.id}
                      className="btn-secondary"
                      style={activeThemeId === theme.id || themeHasActive ? { borderColor: 'var(--accent, #8b5cf6)' } : undefined}
                      title={theme.tagline ? `"${theme.tagline}"` : undefined}
                      onClick={() => setActiveThemeId(theme.id)}
                    >
                      {themeHasActive ? '✓ ' : ''}{theme.label}
                    </button>
                  )
                })}
              </div>
            )}

            {activeBrandId && BRAND_THEME_CONFIG[activeBrandId] && activeThemeId && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8, paddingTop: 10, borderTop: '1px dashed var(--border)' }}>
                {['SP', 'P', 'S'].map(variantKey => {
                  const v = BRAND_THEME_CONFIG[activeBrandId].themes.find(t => t.id === activeThemeId)?.variants[variantKey]
                  if (!v) return null
                  return (
                    <button
                      key={v.id}
                      className="btn-secondary"
                      style={activePresetId === v.id ? { borderColor: 'var(--accent, #8b5cf6)' } : undefined}
                      onClick={() => handleApplyPreset(v)}
                    >
                      {activePresetId === v.id ? '✓ ' : ''}{variantKey}
                    </button>
                  )
                })}
              </div>
            )}

            {presetPrompt && (
              <div style={{ marginTop: 14 }}>
                <div className="form-label" style={{ marginBottom: 6 }}>
                  Active Preset Prompt — editable
                </div>
                <textarea
                  className="form-textarea"
                  value={presetPrompt}
                  onChange={e => setPresetPrompt(e.target.value)}
                  rows={8}
                  style={{ fontSize: 11, lineHeight: 1.5 }}
                />
                <button
                  className="btn-secondary"
                  style={{ marginTop: 8 }}
                  onClick={handleClearPreset}
                >
                  ✕ Clear preset
                </button>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-generate" onClick={handleGenerate} disabled={loading} style={{ flex: 1 }}>
              {loading ? <><div className="spinner" /> Generating…</> : '🖼️ Generate Thumbnail'}
            </button>
            <button className="btn-secondary" onClick={handleReset} disabled={loading}
              style={{ padding: '14px 18px', fontSize: 13 }}>
              ↺ Reset
            </button>
          </div>
        </div>

        {/* RIGHT — Result */}
        <div className="result-panel">
          <div className="result-header">
            <span className="result-title">
              {loading ? '⏳ Generating…' : result ? '✅ Result' : '🎨 Thumbnail'}
              {result?.provider && (
                <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--text-dim)', marginLeft: 8 }}>
                  via {result.provider === 'openai' ? 'OpenAI (GPT Image 2)' : 'Gemini (Nano Banana Pro)'}
                  {result.quality && ` · ${result.quality} quality`}
                </span>
              )}
            </span>
            {result && (
              <div className="result-actions">
                <button className="btn-secondary" onClick={downloadResult}>⬇ Download</button>
                <button className="btn-secondary" onClick={() => setResult(null)}>🗑 Clear</button>
              </div>
            )}
          </div>

          <div className="result-image-wrap" style={{ minHeight: 420 }}>
            {loading ? (
              <div className="result-placeholder" style={{ width: '100%' }}>
                <div className="skeleton" style={{ aspectRatio: '3 / 4', maxWidth: 320, margin: '0 auto' }} />
                <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  <div className="spinner" style={{ width: 32, height: 32 }} />
                  <p style={{ textAlign: 'center' }}>Compositing your thumbnail…<br />
                    <span style={{ fontSize: 11, opacity: 0.6 }}>This usually takes 10–30 seconds</span></p>
                </div>
              </div>
            ) : result ? (
              <img src={`data:image/png;base64,${result.image}`} alt={result.label} className="result-image" />
            ) : (
              <div className="result-placeholder">
                <div className="result-placeholder-icon">🖼️</div>
                <p>Your 1080×1440 thumbnail will appear here</p>
              </div>
            )}
          </div>

          {result?.provider === 'openai' && result.enrichmentUsed === false && (
            <div className="error-banner" style={{ marginTop: 12, fontSize: 11 }}>
              <span>⚠️</span>
              <span>
                ChatGPT-style prompt enrichment did NOT run for this generation — the raw
                preset was sent as-is. Reason: {result.enrichmentError || 'unknown'}.
                Check the backend terminal for a matching <code>[enrich_openai_prompt]</code> log line.
              </span>
            </div>
          )}
          {result?.provider === 'openai' && result.enrichmentUsed === true && (
            <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-dim)' }}>
              ✅ ChatGPT-style prompt enrichment ran successfully for this generation.
            </div>
          )}

          {result?.prompt && (
            <div style={{ marginTop: 12 }}>
              <button
                className="btn-secondary"
                style={{ fontSize: 11 }}
                onClick={() => setShowPrompt(v => !v)}
              >
                {showPrompt ? '▲ Hide' : '▼ Show'} prompt actually sent to the AI
              </button>
              {showPrompt && (
                <textarea
                  className="form-textarea"
                  readOnly
                  value={result.prompt}
                  rows={10}
                  style={{ marginTop: 8, fontSize: 11, lineHeight: 1.5 }}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
