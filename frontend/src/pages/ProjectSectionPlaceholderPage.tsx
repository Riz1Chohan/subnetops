interface ProjectSectionPlaceholderPageProps {
  title: string;
  description?: string;
}

export function ProjectSectionPlaceholderPage({
  title,
  description = "This section is being rebuilt as part of the v1 UX redesign.",
}: ProjectSectionPlaceholderPageProps) {
  return (
    <section className="panel">
      <h1 style={{ marginTop: 0 }}>{title}</h1>
      <p className="muted">{description}</p>
    </section>
  );
}
