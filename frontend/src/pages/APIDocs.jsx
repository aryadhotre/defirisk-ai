export default function APIDocs() {
  return (
    <div className="h-[80vh] bg-black/20 rounded-xl border border-white/10 overflow-hidden">
      <iframe
        src="http://127.0.0.1:8000/docs"
        className="w-full h-full"
        style={{ border: "none" }}
        title="API Docs"
      />
    </div>
  );
}
