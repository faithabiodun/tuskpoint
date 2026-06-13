import { Reveal } from "./Reveal";

const PROBLEMS = [
  {
    n: "01",
    title: "No reliable history",
    body: "When a long-running agent dies, the in-memory graph state dies with it. There is no durable, addressable record of what it knew at each step.",
  },
  {
    n: "02",
    title: "Can't rewind",
    body: "Even with logs, you cannot rehydrate the exact state at step 7 and continue. Replaying from scratch is slow, costly, and often non-deterministic.",
  },
  {
    n: "03",
    title: "State you can't trust",
    body: "Mutable databases let history be quietly rewritten. You need the byte you wrote to be the byte you read back — content-addressed, not best-effort.",
  },
  {
    n: "04",
    title: "Memory you can't query",
    body: "Vector stores recall fuzzy text, but they aren't the source of truth. You want to ask in English and still land on an exact, loadable checkpoint.",
  },
];

export function ProblemList() {
  return (
    <section id="problem" className="border-t border-line py-20 sm:py-28">
      <div className="container-page">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <Reveal>
            <h2 className="display-sm text-display-sm font-extrabold tracking-tight text-cream">
              Agents forget the moment they crash.
            </h2>
            <p className="mt-5 max-w-md text-slate-400">
              Four failures stand between a demo agent and one you can actually
              operate. TuskPoint closes all four.
            </p>
          </Reveal>

          <div>
            {PROBLEMS.map((p, i) => (
              <Reveal
                key={p.n}
                as="div"
                delay={i * 60}
                className="group grid grid-cols-[auto_1fr] gap-5 border-t border-line py-7 first:border-t-0 sm:gap-8"
              >
                <span className="font-mono text-2xl font-bold text-flame sm:text-3xl">
                  /{p.n}
                </span>
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-cream sm:text-2xl">
                    {p.title}
                  </h3>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400 sm:text-base">
                    {p.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
