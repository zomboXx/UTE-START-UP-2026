const runtimeUrl = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.min.js';
const modelId = 'onnx-community/Qwen2.5-0.5B-Instruct';
const revision = '22942cb7d7ba4cc81bb4673549ca4d4614469b5e';

let generator;

self.addEventListener('message', async ({data}) => {
  try {
    if (!generator) {
      const {env,pipeline} = await import(runtimeUrl);
      env.allowLocalModels = false;
      env.useBrowserCache = true;
      env.backends.onnx.wasm.numThreads = 1;
      generator = await pipeline('text-generation', modelId, {
        revision, device:'wasm', dtype:'q8',
        progress_callback(event) {
          if (event.status === 'progress' && event.file?.endsWith('.onnx')) {
            self.postMessage({type:'download',percent:Math.floor(event.progress)});
          }
        },
      });
    }
    self.postMessage({type:'generating'});
    const messages = [
      {role:'system',content:'Bạn là gia sư. Dùng tiếng Việt. Cho đúng ba dòng ngắn: mục tiêu cụ thể, một bài tập áp dụng, cách tự kiểm tra. Dựa vào nội dung người học đưa. Không chào hỏi, không lặp lại đề bài.'},
      {role:'user',content:`Tôi có ${data.minutes} phút để ôn ${data.topic}. Phần cần tập trung: ${data.context || data.topic}. Hãy viết nội dung cho buổi ôn.`},
    ];
    const [output] = await generator(messages, {max_new_tokens:180, do_sample:false, return_full_text:false});
    const generated = output?.generated_text;
    const text = Array.isArray(generated) ? generated.findLast(turn => turn.role === 'assistant')?.content : generated;
    if (typeof text !== 'string' || !text.trim()) throw new Error('No study content was generated');
    self.postMessage({type:'result',text:text.trim()});
  } catch {
    self.postMessage({type:'error'});
  }
});
