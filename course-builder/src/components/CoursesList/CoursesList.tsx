import { useNavigate } from "react-router-dom";
import { useCoursesStore } from "../../store/courses";
import { useCourseStore } from "../../store/course";
import { useUIStore } from "../../store/ui";
import { LANGUAGES } from "../../lib/constants";
import { Plus, Trash2, Clock, Globe, Settings } from "lucide-react";
import CourseConfigModal from "../CourseConfig/CourseConfigModal";

export default function CoursesList() {
  const courses = useCoursesStore((s) => s.courses);
  const setActiveCourse = useCoursesStore((s) => s.setActiveCourse);
  const deleteCourse = useCoursesStore((s) => s.deleteCourse);
  const createCourse = useCoursesStore((s) => s.createCourse);
  const openConfigModal = useUIStore((s) => s.openConfigModal);
  const navigate = useNavigate();

  const handleCreate = () => {
    const id = createCourse(["en"], "en");
    useCourseStore.getState().resetCourse();
    setActiveCourse(id);
    openConfigModal();
  };

  const handleOpen = (id: string) => {
    setActiveCourse(id);
    navigate(`/course/${id}`);
  };

  const courseList = Object.values(courses);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-paper)]">
      <header className="border-b border-[var(--color-line)] bg-[var(--color-elevated)] px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[var(--color-ink)]">Course Builder</h1>
            <p className="text-sm text-[var(--color-muted)]">
              Create and manage multi-language courses
            </p>
          </div>
          <button
            onClick={handleCreate}
            className="focus-ring flex items-center gap-2 rounded-lg bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-brand-hover)]"
          >
            <Plus size={16} />
            New Course
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 p-6">
        {courseList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-[var(--color-sunken)]">
              <Plus size={40} className="text-[var(--color-muted)]" />
            </div>
            <h2 className="mb-2 text-lg font-semibold text-[var(--color-ink)]">
              No courses yet
            </h2>
            <p className="mb-6 max-w-sm text-sm text-[var(--color-muted)]">
              Create your first multi-language course to get started
            </p>
            <button
              onClick={handleCreate}
              className="focus-ring flex items-center gap-2 rounded-lg bg-[var(--color-brand)] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--color-brand-hover)]"
            >
              <Plus size={18} />
              Create Course
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="list">
            {courseList.map((course) => (
              <div
                key={course.id}
                role="listitem"
                tabIndex={0}
                className="group cursor-pointer rounded-xl border border-[var(--color-line)] bg-[var(--color-elevated)] p-4 transition-all hover:border-[var(--color-brand)] hover:shadow-md focus-within:border-[var(--color-brand)] focus-within:shadow-md outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]"
                onClick={() => handleOpen(course.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleOpen(course.id);
                  }
                }}
                aria-label={`Open course: ${course.title.en || "Untitled Course"}`}
              >
                <div className="mb-3 flex items-start justify-between">
                  <h3 className="font-semibold text-[var(--color-ink)] line-clamp-1">
                    {course.title.en || "Untitled Course"}
                  </h3>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveCourse(course.id);
                        openConfigModal();
                      }}
                      aria-label={`Settings for ${course.title.en || "Untitled Course"}`}
                      className="focus-ring shrink-0 rounded p-2 text-[var(--color-muted)] transition-opacity hover:text-[var(--color-brand)] md:opacity-0 md:group-hover:opacity-100"
                    >
                      <Settings size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("Delete this course?")) deleteCourse(course.id);
                      }}
                      aria-label={`Delete course: ${course.title.en || "Untitled Course"}`}
                      className="focus-ring shrink-0 rounded p-2 text-[var(--color-muted)] transition-opacity hover:text-[var(--color-danger)] md:opacity-0 md:group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {course.description.en && (
                  <p className="mb-3 text-xs text-[var(--color-muted)] line-clamp-2">
                    {course.description.en}
                  </p>
                )}

                <div className="flex items-center gap-3 text-[10px] text-[var(--color-muted)]">
                  <span className="flex items-center gap-1">
                    <Globe size={12} />
                    {course.languages
                      .map((l) => LANGUAGES.find((x) => x.code === l)?.nativeLabel)
                      .join(", ")}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {new Date(course.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <CourseConfigModal />
    </div>
  );
}
