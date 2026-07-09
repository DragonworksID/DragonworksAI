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
Maintain: deep midnight black and charcoal undertones, with electric blue, violet and hot-magenta neon light as the accent color grade, as the dominant color story across the whole image.
Background characteristics: High-energy gaming/esports mood — dramatic, cinematic, intense and powerful. Premium and polished. Consistent with the Lenovo Legion Tab "Play All Out" color and lighting identity.
Add: Subtle depth of field, Soft ambient glow
SUBJECT TREATMENT: Keep both the subject/talent and the product recognizable, make them stand out together as the focus point. Keep the original person and the product recognizable.
IMPORTANT: Preserve facial and product identity. Preserve facial identity, Natural skin texture, Realistic photography look, No AI-generated face appearance, No excessive beauty filter, No plastic skin, No exaggerated facial features, No cartoon effect. Preserve the product's exact shape, packaging, color, branding and markings — no invented or altered product details.
Enhance: Natural lighting, Subject visibility, Product visibility, Sharpness, Contrast, Subject separation from background
HEADLINE: {{HEADLINE}}
TYPOGRAPHY: A bold, angular, futuristic esports/gaming display font with a slight forward lean — bright white or icy-blue fill with a thin neon-blue or magenta glow outline, aggressive and high-contrast against the dark background. Position small uppercase brand text reading "LENOVO" and "LEGION TAB" near the headline as a consistent brand tag, exactly like the official Lenovo Legion Tab "Play All Out" template.
COMPOSITION: Visual hierarchy: Subject Product Headline Background. Maintain clear spacing. Avoid clutter. Keep the layout balanced. Ensure readability on mobile screens.
LIGHTING: Commercial advertising photography. Use: Soft premium highlights, Natural shadows, High-energy gaming/esports mood, dramatic and cinematic lighting
STYLE REFERENCE: Official Lenovo Legion Tab "Play All Out" premium social media campaign, TikTok viral thumbnail, Modern tech advertising, High CTR design
QUALITY: Ultra realistic, Commercial photography, Premium advertising quality, Sharp focus, Consistent Lenovo Legion Tab branding, 1080x1440`,
      get openai() { return this.gemini } } },
      P: { id: 'lenovo-legion-tab-p', templates: { gemini:
`You are a professional advertising designer creating a premium TikTok thumbnail for Lenovo Legion Tab.
INPUTS: Cover photo (product) + Background reference image. No people in frame.
Headline text OBJECTIVE: Transform the cover photo into a premium, high-CTR TikTok thumbnail while maintaining a consistent Lenovo Legion Tab "Play All Out" visual identity across all content.
OUTPUT SIZE: 1080 x 1440 px Vertical format TikTok optimized
BACKGROUND: Use the uploaded background reference as the actual visual environment for this shot — it is the real backdrop, not a mood board to be replaced or ignored. Keep its own content, layout and composition intact; render it as a natural, photographically real scene (never a flat illustration/clip-art copy). Grade its lighting, shadows and color palette toward the Lenovo Legion Tab "Play All Out" identity below.
Maintain: deep midnight black and charcoal undertones, with electric blue, violet and hot-magenta neon light as the accent color grade, as the dominant color story across the whole image.
Background characteristics: High-energy gaming/esports mood — dramatic, cinematic, intense and powerful. Premium and polished. Consistent with the Lenovo Legion Tab "Play All Out" color and lighting identity.
Add: Subtle depth of field, Soft ambient glow
SUBJECT TREATMENT: The product is the sole subject and absolute focus point of the image. Do NOT include any people, talent, hands, or human presence anywhere in the frame — product only. Keep the product recognizable and standing out as the hero of the shot.
IMPORTANT: Preserve product identity exactly. Preserve the product's exact shape, packaging, color, branding and markings. Realistic photography look, No AI-generated distortion, No cartoon effect, No invented or altered product details.
Enhance: Natural lighting, Product visibility, Sharpness, Contrast, Subject separation from background
HEADLINE: {{HEADLINE}}
TYPOGRAPHY: A bold, angular, futuristic esports/gaming display font with a slight forward lean — bright white or icy-blue fill with a thin neon-blue or magenta glow outline, aggressive and high-contrast against the dark background. Position small uppercase brand text reading "LENOVO" and "LEGION TAB" near the headline as a consistent brand tag, exactly like the official Lenovo Legion Tab "Play All Out" template.
COMPOSITION: Visual hierarchy: Product Headline Background. Maintain clear spacing. Avoid clutter. Keep the layout balanced. Ensure readability on mobile screens.
LIGHTING: Commercial advertising photography. Use: Soft premium highlights, Natural shadows, High-energy gaming/esports mood, dramatic and cinematic lighting
STYLE REFERENCE: Official Lenovo Legion Tab "Play All Out" premium social media campaign, TikTok viral thumbnail, Modern tech advertising, High CTR design
QUALITY: Ultra realistic, Commercial photography, Premium advertising quality, Sharp focus, Consistent Lenovo Legion Tab branding, 1080x1440`,
      get openai() { return this.gemini } } },
      S: { id: 'lenovo-legion-tab-s', templates: { gemini:
`You are a professional advertising designer creating a premium TikTok thumbnail for Lenovo Legion Tab.
INPUTS: Cover photo (talent/subject) + Background reference image
Headline text OBJECTIVE: Transform the cover photo into a premium, high-CTR TikTok thumbnail while maintaining a consistent Lenovo Legion Tab "Play All Out" visual identity across all content.
OUTPUT SIZE: 1080 x 1440 px Vertical format TikTok optimized
BACKGROUND: Use the uploaded background reference as the actual visual environment for this shot — it is the real backdrop, not a mood board to be replaced or ignored. Keep its own content, layout and composition intact; render it as a natural, photographically real scene (never a flat illustration/clip-art copy). Grade its lighting, shadows and color palette toward the Lenovo Legion Tab "Play All Out" identity below.
Maintain: deep midnight black and charcoal undertones, with electric blue, violet and hot-magenta neon light as the accent color grade, as the dominant color story across the whole image.
Background characteristics: High-energy gaming/esports mood — dramatic, cinematic, intense and powerful. Premium and polished. Consistent with the Lenovo Legion Tab "Play All Out" color and lighting identity.
Add: Subtle depth of field, Soft ambient glow
SUBJECT TREATMENT: Keep the subject recognizable, make it stand out and the focus point. Keep the original person recognizable.
IMPORTANT: Preserve facial identity, Natural skin texture, Realistic photography look, No AI-generated face appearance, No excessive beauty filter, No plastic skin, No exaggerated facial features, No cartoon effect
Enhance: Natural lighting, Subject visibility, Sharpness, Contrast, Subject separation from background
HEADLINE: {{HEADLINE}}
TYPOGRAPHY: A bold, angular, futuristic esports/gaming display font with a slight forward lean — bright white or icy-blue fill with a thin neon-blue or magenta glow outline, aggressive and high-contrast against the dark background. Position small uppercase brand text reading "LENOVO" and "LEGION TAB" near the headline as a consistent brand tag, exactly like the official Lenovo Legion Tab "Play All Out" template.
COMPOSITION: Visual hierarchy: Subject Headline Background. Maintain clear spacing. Avoid clutter. Keep the layout balanced. Ensure readability on mobile screens.
LIGHTING: Commercial advertising photography. Use: Soft premium highlights, Natural shadows, High-energy gaming/esports mood, dramatic and cinematic lighting
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
Maintain: a warm sunset-inspired color grade of soft coral, peach, blush pink and lavender as the dominant color story across the whole image.
Background characteristics: Calm, dreamy and creative mood — gentle, warm and flowing. Premium and polished. Consistent with the Lenovo Yoga Tab "Flow In Color" color and lighting identity.
Add: Subtle depth of field, Soft ambient glow
SUBJECT TREATMENT: Keep both the subject/talent and the product recognizable, make them stand out together as the focus point. Keep the original person and the product recognizable.
IMPORTANT: Preserve facial and product identity. Preserve facial identity, Natural skin texture, Realistic photography look, No AI-generated face appearance, No excessive beauty filter, No plastic skin, No exaggerated facial features, No cartoon effect. Preserve the product's exact shape, packaging, color, branding and markings — no invented or altered product details.
Enhance: Natural lighting, Subject visibility, Product visibility, Sharpness, Contrast, Subject separation from background
HEADLINE: {{HEADLINE}}
TYPOGRAPHY: A friendly, rounded bold sans-serif for the main headline text in dark charcoal, paired with a light, flowing script/cursive accent style for any secondary tagline text in warm coral or pink — soft, elegant and calming. Position small uppercase brand text reading "LENOVO" and "YOGA TAB" near the headline as a consistent brand tag, exactly like the official Lenovo Yoga Tab "Flow In Color" template.
COMPOSITION: Visual hierarchy: Subject Product Headline Background. Maintain clear spacing. Avoid clutter. Keep the layout balanced. Ensure readability on mobile screens.
LIGHTING: Commercial advertising photography. Use: Soft premium highlights, Natural shadows, Calm dreamy mood, warm golden-hour glow
STYLE REFERENCE: Official Lenovo Yoga Tab "Flow In Color" premium social media campaign, TikTok viral thumbnail, Modern tech advertising, High CTR design
QUALITY: Ultra realistic, Commercial photography, Premium advertising quality, Sharp focus, Consistent Lenovo Yoga Tab branding, 1080x1440`,
      get openai() { return this.gemini } } },
      P: { id: 'lenovo-yoga-tab-p', templates: { gemini:
`You are a professional advertising designer creating a premium TikTok thumbnail for Lenovo Yoga Tab.
INPUTS: Cover photo (product) + Background reference image. No people in frame.
Headline text OBJECTIVE: Transform the cover photo into a premium, high-CTR TikTok thumbnail while maintaining a consistent Lenovo Yoga Tab "Flow In Color" visual identity across all content.
OUTPUT SIZE: 1080 x 1440 px Vertical format TikTok optimized
BACKGROUND: Use the uploaded background reference as the actual visual environment for this shot — it is the real backdrop, not a mood board to be replaced or ignored. Keep its own content, layout and composition intact; render it as a natural, photographically real scene (never a flat illustration/clip-art copy). Grade its lighting, shadows and color palette toward the Lenovo Yoga Tab "Flow In Color" identity below.
Maintain: a warm sunset-inspired color grade of soft coral, peach, blush pink and lavender as the dominant color story across the whole image.
Background characteristics: Calm, dreamy and creative mood — gentle, warm and flowing. Premium and polished. Consistent with the Lenovo Yoga Tab "Flow In Color" color and lighting identity.
Add: Subtle depth of field, Soft ambient glow
SUBJECT TREATMENT: The product is the sole subject and absolute focus point of the image. Do NOT include any people, talent, hands, or human presence anywhere in the frame — product only. Keep the product recognizable and standing out as the hero of the shot.
IMPORTANT: Preserve product identity exactly. Preserve the product's exact shape, packaging, color, branding and markings. Realistic photography look, No AI-generated distortion, No cartoon effect, No invented or altered product details.
Enhance: Natural lighting, Product visibility, Sharpness, Contrast, Subject separation from background
HEADLINE: {{HEADLINE}}
TYPOGRAPHY: A friendly, rounded bold sans-serif for the main headline text in dark charcoal, paired with a light, flowing script/cursive accent style for any secondary tagline text in warm coral or pink — soft, elegant and calming. Position small uppercase brand text reading "LENOVO" and "YOGA TAB" near the headline as a consistent brand tag, exactly like the official Lenovo Yoga Tab "Flow In Color" template.
COMPOSITION: Visual hierarchy: Product Headline Background. Maintain clear spacing. Avoid clutter. Keep the layout balanced. Ensure readability on mobile screens.
LIGHTING: Commercial advertising photography. Use: Soft premium highlights, Natural shadows, Calm dreamy mood, warm golden-hour glow
STYLE REFERENCE: Official Lenovo Yoga Tab "Flow In Color" premium social media campaign, TikTok viral thumbnail, Modern tech advertising, High CTR design
QUALITY: Ultra realistic, Commercial photography, Premium advertising quality, Sharp focus, Consistent Lenovo Yoga Tab branding, 1080x1440`,
      get openai() { return this.gemini } } },
      S: { id: 'lenovo-yoga-tab-s', templates: { gemini:
`You are a professional advertising designer creating a premium TikTok thumbnail for Lenovo Yoga Tab.
INPUTS: Cover photo (talent/subject) + Background reference image
Headline text OBJECTIVE: Transform the cover photo into a premium, high-CTR TikTok thumbnail while maintaining a consistent Lenovo Yoga Tab "Flow In Color" visual identity across all content.
OUTPUT SIZE: 1080 x 1440 px Vertical format TikTok optimized
BACKGROUND: Use the uploaded background reference as the actual visual environment for this shot — it is the real backdrop, not a mood board to be replaced or ignored. Keep its own content, layout and composition intact; render it as a natural, photographically real scene (never a flat illustration/clip-art copy). Grade its lighting, shadows and color palette toward the Lenovo Yoga Tab "Flow In Color" identity below.
Maintain: a warm sunset-inspired color grade of soft coral, peach, blush pink and lavender as the dominant color story across the whole image.
Background characteristics: Calm, dreamy and creative mood — gentle, warm and flowing. Premium and polished. Consistent with the Lenovo Yoga Tab "Flow In Color" color and lighting identity.
Add: Subtle depth of field, Soft ambient glow
SUBJECT TREATMENT: Keep the subject recognizable, make it stand out and the focus point. Keep the original person recognizable.
IMPORTANT: Preserve facial identity, Natural skin texture, Realistic photography look, No AI-generated face appearance, No excessive beauty filter, No plastic skin, No exaggerated facial features, No cartoon effect
Enhance: Natural lighting, Subject visibility, Sharpness, Contrast, Subject separation from background
HEADLINE: {{HEADLINE}}
TYPOGRAPHY: A friendly, rounded bold sans-serif for the main headline text in dark charcoal, paired with a light, flowing script/cursive accent style for any secondary tagline text in warm coral or pink — soft, elegant and calming. Position small uppercase brand text reading "LENOVO" and "YOGA TAB" near the headline as a consistent brand tag, exactly like the official Lenovo Yoga Tab "Flow In Color" template.
COMPOSITION: Visual hierarchy: Subject Headline Background. Maintain clear spacing. Avoid clutter. Keep the layout balanced. Ensure readability on mobile screens.
LIGHTING: Commercial advertising photography. Use: Soft premium highlights, Natural shadows, Calm dreamy mood, warm golden-hour glow
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
Maintain: a soft pastel sky-blue and powder-blue color grade with clean white cloud-like highlights as the dominant color story across the whole image.
Background characteristics: Clean, productive and professional mood — bright, airy and inspiring. Premium and polished. Consistent with the Lenovo Idea Tab Pro "Create More, Achieve More" color and lighting identity.
Add: Subtle depth of field, Soft ambient glow
SUBJECT TREATMENT: Keep both the subject/talent and the product recognizable, make them stand out together as the focus point. Keep the original person and the product recognizable.
IMPORTANT: Preserve facial and product identity. Preserve facial identity, Natural skin texture, Realistic photography look, No AI-generated face appearance, No excessive beauty filter, No plastic skin, No exaggerated facial features, No cartoon effect. Preserve the product's exact shape, packaging, color, branding and markings — no invented or altered product details.
Enhance: Natural lighting, Subject visibility, Product visibility, Sharpness, Contrast, Subject separation from background
HEADLINE: {{HEADLINE}}
TYPOGRAPHY: A clean, confident bold sans-serif for the main headline text in near-black, paired with a smooth italic script accent style for any secondary tagline text in deep navy blue — professional, modern and approachable. Position small uppercase brand text reading "LENOVO" and "IDEA TAB PRO" near the headline as a consistent brand tag, exactly like the official Lenovo Idea Tab Pro "Create More, Achieve More" template.
COMPOSITION: Visual hierarchy: Subject Product Headline Background. Maintain clear spacing. Avoid clutter. Keep the layout balanced. Ensure readability on mobile screens.
LIGHTING: Commercial advertising photography. Use: Soft premium highlights, Natural shadows, Bright clean productive mood, soft even daylight
STYLE REFERENCE: Official Lenovo Idea Tab Pro "Create More, Achieve More" premium social media campaign, TikTok viral thumbnail, Modern tech advertising, High CTR design
QUALITY: Ultra realistic, Commercial photography, Premium advertising quality, Sharp focus, Consistent Lenovo Idea Tab Pro branding, 1080x1440`,
      get openai() { return this.gemini } } },
      P: { id: 'lenovo-idea-tab-pro-p', templates: { gemini:
`You are a professional advertising designer creating a premium TikTok thumbnail for Lenovo Idea Tab Pro.
INPUTS: Cover photo (product) + Background reference image. No people in frame.
Headline text OBJECTIVE: Transform the cover photo into a premium, high-CTR TikTok thumbnail while maintaining a consistent Lenovo Idea Tab Pro "Create More, Achieve More" visual identity across all content.
OUTPUT SIZE: 1080 x 1440 px Vertical format TikTok optimized
BACKGROUND: Use the uploaded background reference as the actual visual environment for this shot — it is the real backdrop, not a mood board to be replaced or ignored. Keep its own content, layout and composition intact; render it as a natural, photographically real scene (never a flat illustration/clip-art copy). Grade its lighting, shadows and color palette toward the Lenovo Idea Tab Pro "Create More, Achieve More" identity below.
Maintain: a soft pastel sky-blue and powder-blue color grade with clean white cloud-like highlights as the dominant color story across the whole image.
Background characteristics: Clean, productive and professional mood — bright, airy and inspiring. Premium and polished. Consistent with the Lenovo Idea Tab Pro "Create More, Achieve More" color and lighting identity.
Add: Subtle depth of field, Soft ambient glow
SUBJECT TREATMENT: The product is the sole subject and absolute focus point of the image. Do NOT include any people, talent, hands, or human presence anywhere in the frame — product only. Keep the product recognizable and standing out as the hero of the shot.
IMPORTANT: Preserve product identity exactly. Preserve the product's exact shape, packaging, color, branding and markings. Realistic photography look, No AI-generated distortion, No cartoon effect, No invented or altered product details.
Enhance: Natural lighting, Product visibility, Sharpness, Contrast, Subject separation from background
HEADLINE: {{HEADLINE}}
TYPOGRAPHY: A clean, confident bold sans-serif for the main headline text in near-black, paired with a smooth italic script accent style for any secondary tagline text in deep navy blue — professional, modern and approachable. Position small uppercase brand text reading "LENOVO" and "IDEA TAB PRO" near the headline as a consistent brand tag, exactly like the official Lenovo Idea Tab Pro "Create More, Achieve More" template.
COMPOSITION: Visual hierarchy: Product Headline Background. Maintain clear spacing. Avoid clutter. Keep the layout balanced. Ensure readability on mobile screens.
LIGHTING: Commercial advertising photography. Use: Soft premium highlights, Natural shadows, Bright clean productive mood, soft even daylight
STYLE REFERENCE: Official Lenovo Idea Tab Pro "Create More, Achieve More" premium social media campaign, TikTok viral thumbnail, Modern tech advertising, High CTR design
QUALITY: Ultra realistic, Commercial photography, Premium advertising quality, Sharp focus, Consistent Lenovo Idea Tab Pro branding, 1080x1440`,
      get openai() { return this.gemini } } },
      S: { id: 'lenovo-idea-tab-pro-s', templates: { gemini:
`You are a professional advertising designer creating a premium TikTok thumbnail for Lenovo Idea Tab Pro.
INPUTS: Cover photo (talent/subject) + Background reference image
Headline text OBJECTIVE: Transform the cover photo into a premium, high-CTR TikTok thumbnail while maintaining a consistent Lenovo Idea Tab Pro "Create More, Achieve More" visual identity across all content.
OUTPUT SIZE: 1080 x 1440 px Vertical format TikTok optimized
BACKGROUND: Use the uploaded background reference as the actual visual environment for this shot — it is the real backdrop, not a mood board to be replaced or ignored. Keep its own content, layout and composition intact; render it as a natural, photographically real scene (never a flat illustration/clip-art copy). Grade its lighting, shadows and color palette toward the Lenovo Idea Tab Pro "Create More, Achieve More" identity below.
Maintain: a soft pastel sky-blue and powder-blue color grade with clean white cloud-like highlights as the dominant color story across the whole image.
Background characteristics: Clean, productive and professional mood — bright, airy and inspiring. Premium and polished. Consistent with the Lenovo Idea Tab Pro "Create More, Achieve More" color and lighting identity.
Add: Subtle depth of field, Soft ambient glow
SUBJECT TREATMENT: Keep the subject recognizable, make it stand out and the focus point. Keep the original person recognizable.
IMPORTANT: Preserve facial identity, Natural skin texture, Realistic photography look, No AI-generated face appearance, No excessive beauty filter, No plastic skin, No exaggerated facial features, No cartoon effect
Enhance: Natural lighting, Subject visibility, Sharpness, Contrast, Subject separation from background
HEADLINE: {{HEADLINE}}
TYPOGRAPHY: A clean, confident bold sans-serif for the main headline text in near-black, paired with a smooth italic script accent style for any secondary tagline text in deep navy blue — professional, modern and approachable. Position small uppercase brand text reading "LENOVO" and "IDEA TAB PRO" near the headline as a consistent brand tag, exactly like the official Lenovo Idea Tab Pro "Create More, Achieve More" template.
COMPOSITION: Visual hierarchy: Subject Headline Background. Maintain clear spacing. Avoid clutter. Keep the layout balanced. Ensure readability on mobile screens.
LIGHTING: Commercial advertising photography. Use: Soft premium highlights, Natural shadows, Bright clean productive mood, soft even daylight
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
Maintain: a warm cream/ivory color grade with playful pastel pink, sky-blue and soft-yellow accents as the dominant color story across the whole image.
Background characteristics: Light, playful and easygoing mood — minimal, cheerful and fun. Premium and polished. Consistent with the MotoPad 60 Lite "Fun Made Easy" color and lighting identity.
Add: Subtle depth of field, Soft ambient glow
SUBJECT TREATMENT: Keep both the subject/talent and the product recognizable, make them stand out together as the focus point. Keep the original person and the product recognizable.
IMPORTANT: Preserve facial and product identity. Preserve facial identity, Natural skin texture, Realistic photography look, No AI-generated face appearance, No excessive beauty filter, No plastic skin, No exaggerated facial features, No cartoon effect. Preserve the product's exact shape, packaging, color, branding and markings — no invented or altered product details.
Enhance: Natural lighting, Subject visibility, Product visibility, Sharpness, Contrast, Subject separation from background
HEADLINE: {{HEADLINE}}
TYPOGRAPHY: A friendly, chunky rounded bold sans-serif for the main headline text in dark charcoal, paired with a playful cursive/script accent style for any secondary tagline text in soft teal or aqua — casual, light-hearted and easy to read. Position small uppercase brand text reading "MOTOPAD" and "60 LITE" near the headline as a consistent brand tag, exactly like the official MotoPad 60 Lite "Fun Made Easy" template.
COMPOSITION: Visual hierarchy: Subject Product Headline Background. Maintain clear spacing. Avoid clutter. Keep the layout balanced. Ensure readability on mobile screens.
LIGHTING: Commercial advertising photography. Use: Soft premium highlights, Natural shadows, Light playful mood, bright even daylight
STYLE REFERENCE: Official MotoPad 60 Lite "Fun Made Easy" premium social media campaign, TikTok viral thumbnail, Modern tech advertising, High CTR design
QUALITY: Ultra realistic, Commercial photography, Premium advertising quality, Sharp focus, Consistent MotoPad 60 Lite branding, 1080x1440`,
      get openai() { return this.gemini } } },
      P: { id: 'lenovo-motopad-60-lite-p', templates: { gemini:
`You are a professional advertising designer creating a premium TikTok thumbnail for Lenovo MotoPad 60 Lite.
INPUTS: Cover photo (product) + Background reference image. No people in frame.
Headline text OBJECTIVE: Transform the cover photo into a premium, high-CTR TikTok thumbnail while maintaining a consistent MotoPad 60 Lite "Fun Made Easy" visual identity across all content.
OUTPUT SIZE: 1080 x 1440 px Vertical format TikTok optimized
BACKGROUND: Use the uploaded background reference as the actual visual environment for this shot — it is the real backdrop, not a mood board to be replaced or ignored. Keep its own content, layout and composition intact; render it as a natural, photographically real scene (never a flat illustration/clip-art copy). Grade its lighting, shadows and color palette toward the MotoPad 60 Lite "Fun Made Easy" identity below.
Maintain: a warm cream/ivory color grade with playful pastel pink, sky-blue and soft-yellow accents as the dominant color story across the whole image.
Background characteristics: Light, playful and easygoing mood — minimal, cheerful and fun. Premium and polished. Consistent with the MotoPad 60 Lite "Fun Made Easy" color and lighting identity.
Add: Subtle depth of field, Soft ambient glow
SUBJECT TREATMENT: The product is the sole subject and absolute focus point of the image. Do NOT include any people, talent, hands, or human presence anywhere in the frame — product only. Keep the product recognizable and standing out as the hero of the shot.
IMPORTANT: Preserve product identity exactly. Preserve the product's exact shape, packaging, color, branding and markings. Realistic photography look, No AI-generated distortion, No cartoon effect, No invented or altered product details.
Enhance: Natural lighting, Product visibility, Sharpness, Contrast, Subject separation from background
HEADLINE: {{HEADLINE}}
TYPOGRAPHY: A friendly, chunky rounded bold sans-serif for the main headline text in dark charcoal, paired with a playful cursive/script accent style for any secondary tagline text in soft teal or aqua — casual, light-hearted and easy to read. Position small uppercase brand text reading "MOTOPAD" and "60 LITE" near the headline as a consistent brand tag, exactly like the official MotoPad 60 Lite "Fun Made Easy" template.
COMPOSITION: Visual hierarchy: Product Headline Background. Maintain clear spacing. Avoid clutter. Keep the layout balanced. Ensure readability on mobile screens.
LIGHTING: Commercial advertising photography. Use: Soft premium highlights, Natural shadows, Light playful mood, bright even daylight
STYLE REFERENCE: Official MotoPad 60 Lite "Fun Made Easy" premium social media campaign, TikTok viral thumbnail, Modern tech advertising, High CTR design
QUALITY: Ultra realistic, Commercial photography, Premium advertising quality, Sharp focus, Consistent MotoPad 60 Lite branding, 1080x1440`,
      get openai() { return this.gemini } } },
      S: { id: 'lenovo-motopad-60-lite-s', templates: { gemini:
`You are a professional advertising designer creating a premium TikTok thumbnail for Lenovo MotoPad 60 Lite.
INPUTS: Cover photo (talent/subject) + Background reference image
Headline text OBJECTIVE: Transform the cover photo into a premium, high-CTR TikTok thumbnail while maintaining a consistent MotoPad 60 Lite "Fun Made Easy" visual identity across all content.
OUTPUT SIZE: 1080 x 1440 px Vertical format TikTok optimized
BACKGROUND: Use the uploaded background reference as the actual visual environment for this shot — it is the real backdrop, not a mood board to be replaced or ignored. Keep its own content, layout and composition intact; render it as a natural, photographically real scene (never a flat illustration/clip-art copy). Grade its lighting, shadows and color palette toward the MotoPad 60 Lite "Fun Made Easy" identity below.
Maintain: a warm cream/ivory color grade with playful pastel pink, sky-blue and soft-yellow accents as the dominant color story across the whole image.
Background characteristics: Light, playful and easygoing mood — minimal, cheerful and fun. Premium and polished. Consistent with the MotoPad 60 Lite "Fun Made Easy" color and lighting identity.
Add: Subtle depth of field, Soft ambient glow
SUBJECT TREATMENT: Keep the subject recognizable, make it stand out and the focus point. Keep the original person recognizable.
IMPORTANT: Preserve facial identity, Natural skin texture, Realistic photography look, No AI-generated face appearance, No excessive beauty filter, No plastic skin, No exaggerated facial features, No cartoon effect
Enhance: Natural lighting, Subject visibility, Sharpness, Contrast, Subject separation from background
HEADLINE: {{HEADLINE}}
TYPOGRAPHY: A friendly, chunky rounded bold sans-serif for the main headline text in dark charcoal, paired with a playful cursive/script accent style for any secondary tagline text in soft teal or aqua — casual, light-hearted and easy to read. Position small uppercase brand text reading "MOTOPAD" and "60 LITE" near the headline as a consistent brand tag, exactly like the official MotoPad 60 Lite "Fun Made Easy" template.
COMPOSITION: Visual hierarchy: Subject Headline Background. Maintain clear spacing. Avoid clutter. Keep the layout balanced. Ensure readability on mobile screens.
LIGHTING: Commercial advertising photography. Use: Soft premium highlights, Natural shadows, Light playful mood, bright even daylight
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
Maintain: a fresh spring-green and sky-blue color grade with soft white cloud-toned highlights as the dominant color story across the whole image.
Background characteristics: Fresh, natural and optimistic mood — relaxed and outdoorsy. Premium and polished. Consistent with the MotoPad 60 Neo "Good Days, Every Day" color and lighting identity.
Add: Subtle depth of field, Soft ambient glow
SUBJECT TREATMENT: Keep both the subject/talent and the product recognizable, make them stand out together as the focus point. Keep the original person and the product recognizable.
IMPORTANT: Preserve facial and product identity. Preserve facial identity, Natural skin texture, Realistic photography look, No AI-generated face appearance, No excessive beauty filter, No plastic skin, No exaggerated facial features, No cartoon effect. Preserve the product's exact shape, packaging, color, branding and markings — no invented or altered product details.
Enhance: Natural lighting, Subject visibility, Product visibility, Sharpness, Contrast, Subject separation from background
HEADLINE: {{HEADLINE}}
TYPOGRAPHY: A clean, rounded bold sans-serif for the main headline text in dark forest green or near-black, paired with a relaxed handwritten-style script accent for any secondary tagline text in fresh green — natural, optimistic and easygoing. Position small uppercase brand text reading "MOTOPAD" and "60 NEO" near the headline as a consistent brand tag, exactly like the official MotoPad 60 Neo "Good Days, Every Day" template.
COMPOSITION: Visual hierarchy: Subject Product Headline Background. Maintain clear spacing. Avoid clutter. Keep the layout balanced. Ensure readability on mobile screens.
LIGHTING: Commercial advertising photography. Use: Soft premium highlights, Natural shadows, Fresh optimistic mood, bright natural daylight
STYLE REFERENCE: Official MotoPad 60 Neo "Good Days, Every Day" premium social media campaign, TikTok viral thumbnail, Modern tech advertising, High CTR design
QUALITY: Ultra realistic, Commercial photography, Premium advertising quality, Sharp focus, Consistent MotoPad 60 Neo branding, 1080x1440`,
      get openai() { return this.gemini } } },
      P: { id: 'lenovo-motopad-60-neo-p', templates: { gemini:
`You are a professional advertising designer creating a premium TikTok thumbnail for Lenovo MotoPad 60 Neo.
INPUTS: Cover photo (product) + Background reference image. No people in frame.
Headline text OBJECTIVE: Transform the cover photo into a premium, high-CTR TikTok thumbnail while maintaining a consistent MotoPad 60 Neo "Good Days, Every Day" visual identity across all content.
OUTPUT SIZE: 1080 x 1440 px Vertical format TikTok optimized
BACKGROUND: Use the uploaded background reference as the actual visual environment for this shot — it is the real backdrop, not a mood board to be replaced or ignored. Keep its own content, layout and composition intact; render it as a natural, photographically real scene (never a flat illustration/clip-art copy). Grade its lighting, shadows and color palette toward the MotoPad 60 Neo "Good Days, Every Day" identity below.
Maintain: a fresh spring-green and sky-blue color grade with soft white cloud-toned highlights as the dominant color story across the whole image.
Background characteristics: Fresh, natural and optimistic mood — relaxed and outdoorsy. Premium and polished. Consistent with the MotoPad 60 Neo "Good Days, Every Day" color and lighting identity.
Add: Subtle depth of field, Soft ambient glow
SUBJECT TREATMENT: The product is the sole subject and absolute focus point of the image. Do NOT include any people, talent, hands, or human presence anywhere in the frame — product only. Keep the product recognizable and standing out as the hero of the shot.
IMPORTANT: Preserve product identity exactly. Preserve the product's exact shape, packaging, color, branding and markings. Realistic photography look, No AI-generated distortion, No cartoon effect, No invented or altered product details.
Enhance: Natural lighting, Product visibility, Sharpness, Contrast, Subject separation from background
HEADLINE: {{HEADLINE}}
TYPOGRAPHY: A clean, rounded bold sans-serif for the main headline text in dark forest green or near-black, paired with a relaxed handwritten-style script accent for any secondary tagline text in fresh green — natural, optimistic and easygoing. Position small uppercase brand text reading "MOTOPAD" and "60 NEO" near the headline as a consistent brand tag, exactly like the official MotoPad 60 Neo "Good Days, Every Day" template.
COMPOSITION: Visual hierarchy: Product Headline Background. Maintain clear spacing. Avoid clutter. Keep the layout balanced. Ensure readability on mobile screens.
LIGHTING: Commercial advertising photography. Use: Soft premium highlights, Natural shadows, Fresh optimistic mood, bright natural daylight
STYLE REFERENCE: Official MotoPad 60 Neo "Good Days, Every Day" premium social media campaign, TikTok viral thumbnail, Modern tech advertising, High CTR design
QUALITY: Ultra realistic, Commercial photography, Premium advertising quality, Sharp focus, Consistent MotoPad 60 Neo branding, 1080x1440`,
      get openai() { return this.gemini } } },
      S: { id: 'lenovo-motopad-60-neo-s', templates: { gemini:
`You are a professional advertising designer creating a premium TikTok thumbnail for Lenovo MotoPad 60 Neo.
INPUTS: Cover photo (talent/subject) + Background reference image
Headline text OBJECTIVE: Transform the cover photo into a premium, high-CTR TikTok thumbnail while maintaining a consistent MotoPad 60 Neo "Good Days, Every Day" visual identity across all content.
OUTPUT SIZE: 1080 x 1440 px Vertical format TikTok optimized
BACKGROUND: Use the uploaded background reference as the actual visual environment for this shot — it is the real backdrop, not a mood board to be replaced or ignored. Keep its own content, layout and composition intact; render it as a natural, photographically real scene (never a flat illustration/clip-art copy). Grade its lighting, shadows and color palette toward the MotoPad 60 Neo "Good Days, Every Day" identity below.
Maintain: a fresh spring-green and sky-blue color grade with soft white cloud-toned highlights as the dominant color story across the whole image.
Background characteristics: Fresh, natural and optimistic mood — relaxed and outdoorsy. Premium and polished. Consistent with the MotoPad 60 Neo "Good Days, Every Day" color and lighting identity.
Add: Subtle depth of field, Soft ambient glow
SUBJECT TREATMENT: Keep the subject recognizable, make it stand out and the focus point. Keep the original person recognizable.
IMPORTANT: Preserve facial identity, Natural skin texture, Realistic photography look, No AI-generated face appearance, No excessive beauty filter, No plastic skin, No exaggerated facial features, No cartoon effect
Enhance: Natural lighting, Subject visibility, Sharpness, Contrast, Subject separation from background
HEADLINE: {{HEADLINE}}
TYPOGRAPHY: A clean, rounded bold sans-serif for the main headline text in dark forest green or near-black, paired with a relaxed handwritten-style script accent for any secondary tagline text in fresh green — natural, optimistic and easygoing. Position small uppercase brand text reading "MOTOPAD" and "60 NEO" near the headline as a consistent brand tag, exactly like the official MotoPad 60 Neo "Good Days, Every Day" template.
COMPOSITION: Visual hierarchy: Subject Headline Background. Maintain clear spacing. Avoid clutter. Keep the layout balanced. Ensure readability on mobile screens.
LIGHTING: Commercial advertising photography. Use: Soft premium highlights, Natural shadows, Fresh optimistic mood, bright natural daylight
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
Maintain: a bold jewel-tone color grade of deep purple, magenta, hot pink and royal blue as the dominant color story across the whole image.
Background characteristics: Premium, bold and dramatic mood — confident and high-end. Polished and glossy. Consistent with the MotoPad 60 Pro "Bold Days, Best You" color and lighting identity.
Add: Subtle depth of field, Soft ambient glow
SUBJECT TREATMENT: Keep both the subject/talent and the product recognizable, make them stand out together as the focus point. Keep the original person and the product recognizable.
IMPORTANT: Preserve facial and product identity. Preserve facial identity, Natural skin texture, Realistic photography look, No AI-generated face appearance, No excessive beauty filter, No plastic skin, No exaggerated facial features, No cartoon effect. Preserve the product's exact shape, packaging, color, branding and markings — no invented or altered product details.
Enhance: Natural lighting, Subject visibility, Product visibility, Sharpness, Contrast, Subject separation from background
HEADLINE: {{HEADLINE}}
TYPOGRAPHY: A bold, premium geometric sans-serif for the main headline text in white or near-black with a subtle metallic sheen, paired with an elegant script accent for any secondary tagline text in vivid purple or magenta — luxurious, confident and high-impact. Position small uppercase brand text reading "MOTOPAD" and "60 PRO" near the headline as a consistent brand tag, exactly like the official MotoPad 60 Pro "Bold Days, Best You" template.
COMPOSITION: Visual hierarchy: Subject Product Headline Background. Maintain clear spacing. Avoid clutter. Keep the layout balanced. Ensure readability on mobile screens.
LIGHTING: Commercial advertising photography. Use: Soft premium highlights, Natural shadows, Bold dramatic mood, high-end studio lighting
STYLE REFERENCE: Official MotoPad 60 Pro "Bold Days, Best You" premium social media campaign, TikTok viral thumbnail, Modern tech advertising, High CTR design
QUALITY: Ultra realistic, Commercial photography, Premium advertising quality, Sharp focus, Consistent MotoPad 60 Pro branding, 1080x1440`,
      get openai() { return this.gemini } } },
      P: { id: 'lenovo-motopad-60-pro-p', templates: { gemini:
`You are a professional advertising designer creating a premium TikTok thumbnail for Lenovo MotoPad 60 Pro.
INPUTS: Cover photo (product) + Background reference image. No people in frame.
Headline text OBJECTIVE: Transform the cover photo into a premium, high-CTR TikTok thumbnail while maintaining a consistent MotoPad 60 Pro "Bold Days, Best You" visual identity across all content.
OUTPUT SIZE: 1080 x 1440 px Vertical format TikTok optimized
BACKGROUND: Use the uploaded background reference as the actual visual environment for this shot — it is the real backdrop, not a mood board to be replaced or ignored. Keep its own content, layout and composition intact; render it as a natural, photographically real scene (never a flat illustration/clip-art copy). Grade its lighting, shadows and color palette toward the MotoPad 60 Pro "Bold Days, Best You" identity below.
Maintain: a bold jewel-tone color grade of deep purple, magenta, hot pink and royal blue as the dominant color story across the whole image.
Background characteristics: Premium, bold and dramatic mood — confident and high-end. Polished and glossy. Consistent with the MotoPad 60 Pro "Bold Days, Best You" color and lighting identity.
Add: Subtle depth of field, Soft ambient glow
SUBJECT TREATMENT: The product is the sole subject and absolute focus point of the image. Do NOT include any people, talent, hands, or human presence anywhere in the frame — product only. Keep the product recognizable and standing out as the hero of the shot.
IMPORTANT: Preserve product identity exactly. Preserve the product's exact shape, packaging, color, branding and markings. Realistic photography look, No AI-generated distortion, No cartoon effect, No invented or altered product details.
Enhance: Natural lighting, Product visibility, Sharpness, Contrast, Subject separation from background
HEADLINE: {{HEADLINE}}
TYPOGRAPHY: A bold, premium geometric sans-serif for the main headline text in white or near-black with a subtle metallic sheen, paired with an elegant script accent for any secondary tagline text in vivid purple or magenta — luxurious, confident and high-impact. Position small uppercase brand text reading "MOTOPAD" and "60 PRO" near the headline as a consistent brand tag, exactly like the official MotoPad 60 Pro "Bold Days, Best You" template.
COMPOSITION: Visual hierarchy: Product Headline Background. Maintain clear spacing. Avoid clutter. Keep the layout balanced. Ensure readability on mobile screens.
LIGHTING: Commercial advertising photography. Use: Soft premium highlights, Natural shadows, Bold dramatic mood, high-end studio lighting
STYLE REFERENCE: Official MotoPad 60 Pro "Bold Days, Best You" premium social media campaign, TikTok viral thumbnail, Modern tech advertising, High CTR design
QUALITY: Ultra realistic, Commercial photography, Premium advertising quality, Sharp focus, Consistent MotoPad 60 Pro branding, 1080x1440`,
      get openai() { return this.gemini } } },
      S: { id: 'lenovo-motopad-60-pro-s', templates: { gemini:
`You are a professional advertising designer creating a premium TikTok thumbnail for Lenovo MotoPad 60 Pro.
INPUTS: Cover photo (talent/subject) + Background reference image
Headline text OBJECTIVE: Transform the cover photo into a premium, high-CTR TikTok thumbnail while maintaining a consistent MotoPad 60 Pro "Bold Days, Best You" visual identity across all content.
OUTPUT SIZE: 1080 x 1440 px Vertical format TikTok optimized
BACKGROUND: Use the uploaded background reference as the actual visual environment for this shot — it is the real backdrop, not a mood board to be replaced or ignored. Keep its own content, layout and composition intact; render it as a natural, photographically real scene (never a flat illustration/clip-art copy). Grade its lighting, shadows and color palette toward the MotoPad 60 Pro "Bold Days, Best You" identity below.
Maintain: a bold jewel-tone color grade of deep purple, magenta, hot pink and royal blue as the dominant color story across the whole image.
Background characteristics: Premium, bold and dramatic mood — confident and high-end. Polished and glossy. Consistent with the MotoPad 60 Pro "Bold Days, Best You" color and lighting identity.
Add: Subtle depth of field, Soft ambient glow
SUBJECT TREATMENT: Keep the subject recognizable, make it stand out and the focus point. Keep the original person recognizable.
IMPORTANT: Preserve facial identity, Natural skin texture, Realistic photography look, No AI-generated face appearance, No excessive beauty filter, No plastic skin, No exaggerated facial features, No cartoon effect
Enhance: Natural lighting, Subject visibility, Sharpness, Contrast, Subject separation from background
HEADLINE: {{HEADLINE}}
TYPOGRAPHY: A bold, premium geometric sans-serif for the main headline text in white or near-black with a subtle metallic sheen, paired with an elegant script accent for any secondary tagline text in vivid purple or magenta — luxurious, confident and high-impact. Position small uppercase brand text reading "MOTOPAD" and "60 PRO" near the headline as a consistent brand tag, exactly like the official MotoPad 60 Pro "Bold Days, Best You" template.
COMPOSITION: Visual hierarchy: Subject Headline Background. Maintain clear spacing. Avoid clutter. Keep the layout balanced. Ensure readability on mobile screens.
LIGHTING: Commercial advertising photography. Use: Soft premium highlights, Natural shadows, Bold dramatic mood, high-end studio lighting
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
  return groups
})()

export default function ThumbnailCreator() {
  const { addToHistory } = useHistory()
  const { showToast } = useToast()

  const [bgImage, setBgImage]     = useState(null)   // { file, preview } — campaign background
  const [baseImage, setBaseImage] = useState(null)   // { file, preview } — talent photo
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
    if (!baseImage?.file) { showToast('Please upload the Subject / Product Reference photo.'); return }
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
    fd.append('base_image', baseImage.file)
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
              <UploadBox
                label="Subject / Product Reference"
                hint="Who or what must stay recognizable"
                icon="🧑"
                image={baseImage}
                onSelect={setBaseImage}
                minHeight={150}
                previewMaxHeight={150}
              />
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
                const groupHasActive = group.variants.some(v => v.id === activePresetId)
                  || (group.id === 'lenovo' && LENOVO_THEME_PRESET_IDS.has(activePresetId))
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
                {activeBrandId === 'lenovo' && (
                  <button
                    className="btn-secondary"
                    style={activeThemeId || LENOVO_THEME_PRESET_IDS.has(activePresetId) ? { borderColor: 'var(--accent, #8b5cf6)' } : undefined}
                    onClick={() => setActiveThemeId(prev => (prev ? null : LENOVO_THEMES[0].id))}
                  >
                    {LENOVO_THEME_PRESET_IDS.has(activePresetId) ? '✓ ' : ''}Themes
                  </button>
                )}
              </div>
            )}

            {activeBrandId === 'lenovo' && activeThemeId && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                {LENOVO_THEMES.map(theme => {
                  const themeHasActive = Object.values(theme.variants).some(v => v.id === activePresetId)
                  return (
                    <button
                      key={theme.id}
                      className="btn-secondary"
                      style={activeThemeId === theme.id || themeHasActive ? { borderColor: 'var(--accent, #8b5cf6)' } : undefined}
                      title={`"${theme.tagline}"`}
                      onClick={() => setActiveThemeId(theme.id)}
                    >
                      {themeHasActive ? '✓ ' : ''}{theme.label}
                    </button>
                  )
                })}
              </div>
            )}

            {activeBrandId === 'lenovo' && activeThemeId && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8, paddingTop: 10, borderTop: '1px dashed var(--border)' }}>
                {['SP', 'P', 'S'].map(variantKey => {
                  const v = LENOVO_THEMES.find(t => t.id === activeThemeId)?.variants[variantKey]
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
