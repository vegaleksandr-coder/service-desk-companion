import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { useUpdateGuide, type Guide, type GuideSection } from "@/hooks/useGuides";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guide: Guide | null;
}

export function GuideEditDialog({ open, onOpenChange, guide }: Props) {
  const [title, setTitle] = useState("");
  const [sections, setSections] = useState<GuideSection[]>([]);
  const updateGuide = useUpdateGuide();

  useEffect(() => {
    if (guide) {
      setTitle(guide.title);
      setSections(guide.sections.map((s) => ({ ...s, content: [...s.content] })));
    }
  }, [guide]);

  const updateSection = (index: number, field: keyof GuideSection, value: any) => {
    setSections((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const updateParagraph = (sectionIdx: number, paraIdx: number, value: string) => {
    setSections((prev) => {
      const next = [...prev];
      const content = [...next[sectionIdx].content];
      content[paraIdx] = value;
      next[sectionIdx] = { ...next[sectionIdx], content };
      return next;
    });
  };

  const addParagraph = (sectionIdx: number) => {
    setSections((prev) => {
      const next = [...prev];
      next[sectionIdx] = {
        ...next[sectionIdx],
        content: [...next[sectionIdx].content, ""],
      };
      return next;
    });
  };

  const removeParagraph = (sectionIdx: number, paraIdx: number) => {
    setSections((prev) => {
      const next = [...prev];
      const content = next[sectionIdx].content.filter((_, i) => i !== paraIdx);
      next[sectionIdx] = { ...next[sectionIdx], content };
      return next;
    });
  };

  const addSection = () => {
    setSections((prev) => [...prev, { title: "", content: [""] }]);
  };

  const removeSection = (index: number) => {
    setSections((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!guide) return;
    // Validate
    const cleanSections = sections
      .filter((s) => s.title.trim())
      .map((s) => ({
        title: s.title.trim(),
        content: s.content.filter((c) => c.trim()),
      }));

    try {
      await updateGuide.mutateAsync({
        id: guide.id,
        title: title.trim(),
        sections: cleanSections,
      });
      toast.success("Инструкция сохранена");
      onOpenChange(false);
    } catch {
      toast.error("Ошибка сохранения");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Редактирование инструкции</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Название инструкции</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="space-y-6">
            {sections.map((section, sIdx) => (
              <div key={sIdx} className="border border-border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Заголовок раздела"
                    value={section.title}
                    onChange={(e) => updateSection(sIdx, "title", e.target.value)}
                    className="font-medium"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-destructive"
                    onClick={() => removeSection(sIdx)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {section.content.map((para, pIdx) => (
                  <div key={pIdx} className="flex gap-2">
                    <Textarea
                      value={para}
                      onChange={(e) => updateParagraph(sIdx, pIdx, e.target.value)}
                      placeholder="Текст абзаца..."
                      rows={2}
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-muted-foreground"
                      onClick={() => removeParagraph(sIdx, pIdx)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addParagraph(sIdx)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Абзац
                </Button>
              </div>
            ))}
          </div>

          <Button variant="outline" onClick={addSection}>
            <Plus className="h-4 w-4 mr-1" />
            Добавить раздел
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={handleSave} disabled={updateGuide.isPending}>
            {updateGuide.isPending ? "Сохранение..." : "Сохранить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
