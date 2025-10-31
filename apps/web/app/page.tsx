export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold text-primary">
          BHMC Admin
        </h1>
        <p className="mt-4 text-muted-foreground">
          Tailwind CSS v4 with CSS Variables
        </p>
        <div className="mt-8 flex gap-4">
          <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
            Primary Button
          </button>
          <button className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90">
            Secondary Button
          </button>
          <button className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90">
            Destructive Button
          </button>
        </div>
      </div>
    </main>
  )
}
