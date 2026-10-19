export default function App() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">Imbaraga</h1>
      <div className="mt-4 flex gap-3">
        <span className="rounded bg-risk-low px-3 py-1 text-white">Low</span>
        <span className="rounded bg-risk-medium px-3 py-1 text-white">Medium</span>
        <span className="rounded bg-risk-high px-3 py-1 text-white">High</span>
      </div>
    </div>
  );
}