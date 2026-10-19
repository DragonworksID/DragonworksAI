import base64
import os
import sys
import unittest
from types import SimpleNamespace
from unittest.mock import patch

sys.path.insert(0, os.path.dirname(__file__))
import main


class ThumbnailModelRoutingTests(unittest.TestCase):
    def test_default_thumbnail_models(self):
        for variable, value in (
            ("OPENAI_RESPONSES_MODEL", "gpt-6-luna"),
            ("OPENAI_TEXT_MODEL", "gpt-6-luna"),
            ("OPENAI_THUMBNAIL_IMAGE_MODEL", "gpt-image-2"),
        ):
            if variable not in os.environ:
                self.assertEqual(getattr(main, variable), value)

    def test_thumbnail_uses_selected_models(self):
        image_result = SimpleNamespace(
            output=[SimpleNamespace(type="image_generation_call", result=base64.b64encode(b"image").decode())]
        )
        prompt_result = SimpleNamespace(
            choices=[SimpleNamespace(message=SimpleNamespace(content="rewritten prompt"))]
        )

        with (
            patch.object(main, "OPENAI_API_KEY", "test-only-key"),
            patch.object(main, "OPENAI_RESPONSES_MODEL", "gpt-6-luna"),
            patch.object(main, "OPENAI_TEXT_MODEL", "gpt-6-luna"),
            patch.object(main, "OPENAI_THUMBNAIL_IMAGE_MODEL", "gpt-image-2"),
            patch.object(main, "ENABLE_OPENAI_PROMPT_ENRICHMENT", True),
            patch.object(main, "_normalize_image_for_openai", return_value=b"png"),
            patch("openai.OpenAI") as openai_client,
        ):
            client = openai_client.return_value
            client.chat.completions.create.return_value = prompt_result
            client.responses.create.return_value = image_result

            prompt, used, error = main.enrich_openai_prompt(
                "original prompt", "Headline", b"background", "image/png", b"subject", "image/png"
            )
            self.assertEqual((prompt, used, error), ("rewritten prompt", True, None))
            self.assertEqual(client.chat.completions.create.call_args.kwargs["model"], "gpt-6-luna")

            image = main._openai_generate_thumbnail_responses(
                prompt, b"background", "image/png", b"subject", "image/png", quality="low"
            )
            self.assertEqual(image, b"image")
            request = client.responses.create.call_args.kwargs
            self.assertEqual(request["model"], "gpt-6-luna")
            self.assertEqual(request["tools"][0]["model"], "gpt-image-2")
            self.assertEqual(request["tools"][0]["quality"], "low")
            self.assertEqual(request["tools"][0]["action"], "generate")


if __name__ == "__main__":
    unittest.main()
