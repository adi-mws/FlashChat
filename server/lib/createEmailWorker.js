import { Worker } from 'worker_threads';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const sendEmailInWorker = (emailData) => {
  const worker = new Worker(path.join(__dirname, '../lib/sendEmailWorker.js'), {
    type: 'module'
  });

  worker.postMessage(emailData);

  worker.on('message', (result) => {
    if (result.success) {
      // console.log('Email sent successfully by worker thread');
    } else {
      console.error('Worker failed to send email:', result.error);
    }
    worker.terminate();
  });

  worker.on('error', (err) => {
    console.error('Worker thread error:', err);
    worker.terminate();
  });
};

