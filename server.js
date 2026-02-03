import { serve } from 'bun';

const server = serve({
  port: process.env.PORT || 3000,
  async fetch(req) {
    const url = new URL(req.url);
    
    if (url.pathname === '/' || url.pathname === '/index.html') {
      const file = Bun.file('public/index.html');
      return new Response(file);
    }
    
    if (url.pathname === '/health') {
      return new Response(
        JSON.stringify({ status: 'healthy' }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    if (url.pathname === '/maoliiny.jpg') {
      const file = Bun.file('public/maoliiny.jpg');
      return new Response(file);
    }
    
    if (url.pathname === '/Oliinyk_CV.pdf') {
      const file = Bun.file('public/Oliinyk_CV.pdf');
      return new Response(file);
    }
    
    return new Response('Not Found', { status: 404 });
  },
});

console.log(`Listening on http://localhost:${server.port}`);
