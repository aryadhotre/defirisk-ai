export default function APIDocs() {
  return (
    <div className="h-[80vh] bg-black/20 rounded-xl border border-white/10 overflow-hidden">
      <iframe
        src="https://defirisk-ai-backend.onrender.com/docs"
        className="w-full h-full"
        style={{ border: "none" }}
        title="API Docs"
      />
    </div>
  );
}
