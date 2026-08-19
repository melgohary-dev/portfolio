import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCoursesStore } from "../../store/courses";
import { CERTIFICATE_TEMPLATES } from "../../lib/constants";
import { createLocalized } from "../../lib/localization";
import { createId } from "../../lib/defaults";
import { ArrowLeft, Check, Palette } from "lucide-react";
import { getLanguageDirection } from "../../lib/constants";
import type { CertificateConfig, LocalizedText } from "../../types";

export default function CertificateBuilder() {
  const navigate = useNavigate();
  const activeCourseId = useCoursesStore((s) => s.activeCourseId);
  const courses = useCoursesStore((s) => s.courses);
  const setCertificate = useCoursesStore((s) => s.setCertificate);
  const certificates = useCoursesStore((s) => s.certificates);
  const course = activeCourseId ? courses[activeCourseId] : null;
  const existing = activeCourseId ? certificates[activeCourseId] : null;

  const [selectedTemplate, setSelectedTemplate] = useState<string>(
    existing?.templateId ?? CERTIFICATE_TEMPLATES[0].id,
  );
  const [bgColor, setBgColor] = useState(existing?.backgroundColor ?? "#ffffff");
  const [borderColor, setBorderColor] = useState(existing?.borderColor ?? "#1e3a5f");
  const [accentColor, setAccentColor] = useState(existing?.accentColor ?? "#1e3a5f");
  const [showDate, setShowDate] = useState(existing?.showDate ?? true);
  const [showInstructor, setShowInstructor] = useState(existing?.showInstructor ?? true);
  const [instructorName, setInstructorName] = useState(existing?.instructorName ?? "");
  const [studentName, setStudentName] = useState(existing?.studentName ?? "");
  const [certTitle, setCertTitle] = useState<LocalizedText>(
    existing?.title ?? createLocalized({ en: "Certificate of Completion" }),
  );
  const [certSubtitle] = useState<LocalizedText>(
    existing?.subtitle ?? createLocalized({ en: "This is to certify that" }),
  );

  if (!course) return null;

  const handleSave = () => {
    if (!activeCourseId) return;
    const cert: CertificateConfig = {
      id: existing?.id ?? createId(),
      templateId: selectedTemplate,
      title: certTitle,
      subtitle: certSubtitle,
      backgroundColor: bgColor,
      borderColor,
      accentColor,
      showDate,
      showInstructor,
      instructorName,
      studentName,
    };
    setCertificate(activeCourseId, cert);
    navigate(`/course/${activeCourseId}`);
  };

  const dir = getLanguageDirection(course.defaultLanguage);

  return (
    <div dir={dir} className="flex min-h-screen flex-col bg-[var(--color-paper)]">
      <header className="flex items-center gap-3 border-b border-[var(--color-line)] bg-[var(--color-elevated)] px-4 py-3">
        <button
          onClick={() => navigate(`/course/${activeCourseId}`)}
          aria-label="Back to builder"
          className="focus-ring rounded-lg p-2 text-[var(--color-muted)] hover:bg-[var(--color-sunken)]"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-sm font-bold text-[var(--color-ink)]">Certificate Builder</h1>
          <p className="text-xs text-[var(--color-muted)]">
            Design the course completion certificate
          </p>
        </div>
        <button
          onClick={handleSave}
          className="focus-ring flex items-center gap-1.5 rounded-lg bg-[var(--color-brand)] px-4 py-2 text-xs font-medium text-white hover:bg-[var(--color-brand-hover)]"
        >
          <Check size={14} />
          Save Certificate
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
        <aside className="w-full shrink-0 overflow-y-auto border-b md:border-b-0 md:border-r border-[var(--color-line)] bg-[var(--color-elevated)] p-4 space-y-5 md:w-80">
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
              Template
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {CERTIFICATE_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setSelectedTemplate(t.id);
                    if (t.defaultConfig.borderColor) setBorderColor(t.defaultConfig.borderColor);
                    if (t.defaultConfig.backgroundColor) setBgColor(t.defaultConfig.backgroundColor);
                    if (t.defaultConfig.accentColor) setAccentColor(t.defaultConfig.accentColor);
                  }}
                  aria-pressed={selectedTemplate === t.id}
                  className={`focus-ring rounded-lg border p-3 text-left transition-all ${
                    selectedTemplate === t.id
                      ? "border-[var(--color-brand)] bg-[var(--color-brand)]/5"
                      : "border-[var(--color-line)] hover:border-[var(--color-muted)]"
                  }`}
                >
                  <div
                    className="mb-2 h-12 rounded border-2"
                    style={{ borderColor, backgroundColor: bgColor }}
                  />
                  <span className="text-xs font-medium text-[var(--color-ink)]">{t.name}</span>
                  <p className="text-[10px] text-[var(--color-muted)]">{t.description}</p>
                </button>
              ))}
            </div>
          </section>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-[var(--color-ink)]">
              Certificate Title
            </span>
            <input
              value={certTitle.en}
              onChange={(e) => setCertTitle({ ...certTitle, en: e.target.value })}
              className="focus-ring w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2 text-sm text-[var(--color-ink)]"
            />
          </label>

          <section>
            <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
              <Palette size={12} /> Colors
            </h3>
            <div className="space-y-2">
              <label className="flex items-center justify-between">
                <span className="text-xs text-[var(--color-ink)]">Background</span>
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  aria-label="Certificate background color"
                  className="h-7 w-7 cursor-pointer rounded border border-[var(--color-line)]"
                />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-xs text-[var(--color-ink)]">Border</span>
                <input
                  type="color"
                  value={borderColor}
                  onChange={(e) => setBorderColor(e.target.value)}
                  aria-label="Certificate border color"
                  className="h-7 w-7 cursor-pointer rounded border border-[var(--color-line)]"
                />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-xs text-[var(--color-ink)]">Accent</span>
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  aria-label="Certificate accent color"
                  className="h-7 w-7 cursor-pointer rounded border border-[var(--color-line)]"
                />
              </label>
            </div>
          </section>

          <section className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showDate}
                onChange={(e) => setShowDate(e.target.checked)}
                className="rounded"
              />
              <span className="text-xs text-[var(--color-ink)]">Show date</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showInstructor}
                onChange={(e) => setShowInstructor(e.target.checked)}
                className="rounded"
              />
              <span className="text-xs text-[var(--color-ink)]">Show instructor</span>
            </label>
            {showInstructor && (
              <label className="block">
                <span className="mb-1 block text-xs text-[var(--color-ink)]">Instructor name</span>
                <input
                  value={instructorName}
                  onChange={(e) => setInstructorName(e.target.value)}
                  placeholder="Instructor name"
                  aria-label="Instructor name"
                  className="focus-ring w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-muted)]"
                />
              </label>
            )}
            <label className="block">
              <span className="mb-1 block text-xs text-[var(--color-ink)]">Student name</span>
              <input
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Student name"
                aria-label="Student name"
                className="focus-ring w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-muted)]"
              />
            </label>
          </section>
        </aside>

        <main className="flex flex-1 items-center justify-center bg-[var(--color-sunken)] p-8 overflow-auto">
          <div
            className="flex w-full max-w-2xl flex-col items-center rounded-lg border-2 p-12 text-center shadow-lg"
            style={{
              backgroundColor: bgColor,
              borderColor: borderColor,
              fontFamily: "Georgia, serif",
            }}
          >
            <div
              className="mb-8 w-full border-t-2 pb-8"
              style={{ borderColor: accentColor }}
            >
              <h1
                className="mb-2 text-3xl font-bold"
                style={{ color: borderColor }}
              >
                {certTitle.en || "Certificate of Completion"}
              </h1>
              <p className="text-sm" style={{ color: accentColor }}>
                {course.title.en || "Course Name"}
              </p>
            </div>

            <p className="mb-4 text-sm text-gray-500">
              {certSubtitle.en || "This is to certify that"}
            </p>

            <div
              className="mb-6 w-64 border-b-2 pb-1 text-xl italic"
              style={{ borderColor: accentColor, color: borderColor }}
            >
              {studentName || "Student Name"}
            </div>

            <p className="mb-6 text-xs text-gray-400">
              has successfully completed the course
            </p>

            <p
              className="mb-8 text-lg font-semibold"
              style={{ color: borderColor }}
            >
              {course.title.en || "Course Name"}
            </p>

            <div className="flex w-full items-end justify-between">
              {showInstructor && (
                <div className="text-left">
                  <div
                    className="mb-1 border-b pb-1 text-sm"
                    style={{ borderColor: accentColor, color: borderColor }}
                  >
                    {instructorName || "Instructor"}
                  </div>
                  <p className="text-[10px] text-gray-400">Instructor</p>
                </div>
              )}
              {showDate && (
                <div className="text-right">
                  <div
                    className="mb-1 border-b pb-1 text-sm"
                    style={{ borderColor: accentColor, color: borderColor }}
                  >
                    {new Date().toLocaleDateString()}
                  </div>
                  <p className="text-[10px] text-gray-400">Date</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
