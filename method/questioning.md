# Questioning

How to fill the fields of the current phase with the owner.

1. Call `status`. The `completeness.missing` list says which pointers are still empty; `learn` topic `fields` says what each field means.
2. Before asking, explore. If the repository, its documentation or an existing feature answers the point, read it and propose the answer instead of asking.
3. Ask one question at a time. Each question names the field it fills and carries your recommended answer with its reason, so the owner can answer "yes" or correct it.
4. Walk the dependencies: settle the intent before the actors, the actors before the scope, the scope before the constraints. When an answer opens a new branch, follow it to the end before coming back.
5. Write each answer at once with `patch`, then read the `validation` part of the result. The projection is re-rendered by the patch; tell the owner which document changed.
6. A point the owner cannot settle now becomes a question object (`framing.questions`, status `open`) with your recommendation. It keeps the phase incomplete until answered.
7. Stop when `status` reports the phase complete. Then ask whether to advance; advance with `phase` only on the owner's yes.

Keep the granularity of the phase: in framing, no requirement, no criterion, no code location. If the owner gives one, note it as a question or a scope line and keep it for its phase.
