import os
import sys
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

sys.path.insert(0, os.path.dirname(__file__))
import main


def _complete_without_io(coroutine):
    try:
        coroutine.send(None)
    except StopIteration as result:
        return result.value
    raise AssertionError("The mocked route unexpectedly awaited external I/O.")


class CaptionModelRoutingTests(unittest.TestCase):
    def test_caption_routes_use_luna_while_scripts_keep_mini(self):
        replies = ["Script draft", "First caption\n===\nSecond caption", "First hook\n===\nSecond hook"]
        with (
            patch.object(main, "SCRIPT_PROVIDER", "openai"),
            patch.object(main, "OPENAI_API_KEY", "test-only-key"),
            patch.object(main, "SCRIPT_TEXT_MODEL", "gpt-5.4-mini"),
            patch.object(main, "OPENAI_CAPTION_TEXT_MODEL", "gpt-6-luna"),
            patch.object(main, "_enforce_script_rate_limit"),
            patch.object(main, "log_script") as log_script,
            patch.object(main, "_run_script_call", new_callable=AsyncMock, side_effect=replies) as run_call,
        ):
            request = SimpleNamespace()
            script = _complete_without_io(main.script_chat(
                request, main.ScriptChatPayload(messages=[{"role": "user", "content": "Make a script"}])
            ))
            caption = _complete_without_io(main.caption_generate(request, main.CaptionPayload(brief="Video brief")))
            thumbnail = _complete_without_io(main.thumbnail_caption(request, main.ThumbnailTextPayload(brief="Video brief")))

            self.assertEqual([script["model"], caption["model"], thumbnail["model"]], [
                "gpt-5.4-mini", "gpt-6-luna", "gpt-6-luna"
            ])
            self.assertNotIn("model", run_call.call_args_list[0].kwargs)
            self.assertEqual(run_call.call_args_list[1].kwargs["model"], "gpt-6-luna")
            self.assertEqual(run_call.call_args_list[2].kwargs["model"], "gpt-6-luna")
            self.assertEqual([entry.kwargs["model"] for entry in log_script.call_args_list], [
                "gpt-5.4-mini", "gpt-6-luna", "gpt-6-luna"
            ])
            self.assertEqual(main.status()["caption_model"], "gpt-6-luna")
            self.assertEqual(main.status()["thumbnail_caption_model"], "gpt-6-luna")

    def test_openai_helper_sends_selected_model(self):
        response = SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content="Caption"))])
        with (
            patch.object(main, "OPENAI_API_KEY", "test-only-key"),
            patch.object(main, "SCRIPT_TEXT_MODEL", "gpt-5.4-mini"),
            patch("openai.OpenAI") as openai_client,
        ):
            openai_client.return_value.chat.completions.create.return_value = response
            history = [{"role": "user", "content": "Video brief"}]
            self.assertEqual(main.openai_script_reply(history, model="gpt-6-luna"), "Caption")
            self.assertEqual(openai_client.return_value.chat.completions.create.call_args.kwargs["model"], "gpt-6-luna")
            self.assertEqual(main.openai_script_reply(history), "Caption")
            self.assertEqual(openai_client.return_value.chat.completions.create.call_args.kwargs["model"], "gpt-5.4-mini")


if __name__ == "__main__":
    unittest.main()
