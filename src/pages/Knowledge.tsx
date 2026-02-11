import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Search, 
  BookOpen, 
  ChevronRight,
  ChevronDown,
  FolderOpen,
  Monitor,
  Wifi,
  Mail,
  Printer,
  HelpCircle,
  Calculator,
  Truck,
  Wrench,
  ConciergeBell,
  ShoppingCart,
  Building2,
  Phone,
  Shield,
  ClipboardList,
  Hammer,
  HeartPulse,
  GraduationCap,
  Car,
  Utensils,
  UserCog,
  Users,
  User,
  Plus,
  Pencil,
  Trash2,
  MessageCircleQuestion,
} from "lucide-react";
import { useState } from "react";
import { useCategories } from "@/hooks/useTickets";
import { useAuth } from "@/contexts/AuthContext";
import { useFaqs, useDeleteFaq, type FAQ } from "@/hooks/useFaqs";
import { FaqManageDialog } from "@/components/FaqManageDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  monitor: Monitor,
  wifi: Wifi,
  mail: Mail,
  printer: Printer,
  help: HelpCircle,
  folder: FolderOpen,
  calculator: Calculator,
  truck: Truck,
  wrench: Wrench,
  concierge: ConciergeBell,
  shopping: ShoppingCart,
  building: Building2,
  phone: Phone,
  shield: Shield,
  clipboard: ClipboardList,
  hammer: Hammer,
  medical: HeartPulse,
  education: GraduationCap,
  car: Car,
  catering: Utensils,
};

const colorMap: Record<string, string> = {
  blue: "bg-blue-500",
  green: "bg-green-500",
  orange: "bg-orange-500",
  purple: "bg-purple-500",
  red: "bg-red-500",
  teal: "bg-teal-500",
  yellow: "bg-yellow-500",
  pink: "bg-pink-500",
  indigo: "bg-indigo-500",
  gray: "bg-gray-500",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
};

const getIcon = (iconName?: string | null) => iconMap[iconName || ""] || FolderOpen;
const getColor = (colorName?: string | null) => colorMap[colorName || ""] || "bg-primary";

interface GuideSection {
  title: string;
  content: string[];
}

const generalGuide: GuideSection[] = [
  {
    title: "Начало работы",
    content: [
      "Для входа в систему используйте логин и пароль, предоставленные администратором. Саморегистрация отключена — учётные записи создаются только администраторами.",
      "Если вы забыли пароль, нажмите «Забыли пароль?» на странице входа и следуйте инструкциям в письме.",
      "После входа вы попадёте на главную страницу (дашборд), где отображается сводная статистика по вашим заявкам.",
    ],
  },
  {
    title: "Создание заявки",
    content: [
      "Нажмите кнопку «Новая заявка» в боковом меню или на главной странице.",
      "Заполните заголовок и описание проблемы. Выберите категорию, приоритет и, при необходимости, укажите дедлайн.",
      "К заявке можно прикрепить файлы (скриншоты, документы) — это поможет исполнителю быстрее разобраться.",
    ],
  },
  {
    title: "Отслеживание заявок",
    content: [
      "Все ваши заявки доступны в разделе «Мои заявки». Используйте фильтры по статусу, приоритету и категории для быстрого поиска.",
      "Статусы заявок: Новая → В работе → Ожидание → Решена → Закрыта.",
      "В карточке заявки вы видите полную историю изменений и комментарии.",
    ],
  },
  {
    title: "Комментарии и общение",
    content: [
      "Вы можете оставлять комментарии к своим заявкам, чтобы уточнить детали или ответить на вопросы исполнителя.",
      "Push-уведомления сообщат вам об изменении статуса заявки (если вы разрешили уведомления в браузере).",
    ],
  },
  {
    title: "Профиль",
    content: [
      "В разделе «Профиль» вы можете изменить своё имя и загрузить аватар.",
    ],
  },
];

const executorGuide: GuideSection[] = [
  {
    title: "Панель исполнителя",
    content: [
      "Раздел «Исполнитель» отображает заявки, назначенные на вас, а также новые заявки в категориях, к которым вы прикреплены.",
      "Вы можете менять статус заявки: взять в работу, перевести в ожидание или отметить как решённую.",
    ],
  },
  {
    title: "Работа с заявками",
    content: [
      "Оставляйте комментарии для заявителя, чтобы уточнить детали. Также доступны внутренние комментарии, видимые только сотрудникам.",
      "Вы можете прикреплять файлы к заявкам (например, скриншоты решения).",
      "При изменении статуса заявки автору автоматически отправляется уведомление.",
    ],
  },
];

const adminGuide: GuideSection[] = [
  {
    title: "Управление пользователями",
    content: [
      "В разделе «Администрирование → Пользователи» вы можете создавать новых пользователей, менять их роли (Пользователь / Исполнитель / Администратор) и сбрасывать пароли.",
      "Делегируйте право управления пользователями — отметьте «Может управлять пользователями» в профиле нужного сотрудника.",
    ],
  },
  {
    title: "Управление категориями",
    content: [
      "В разделе «Администрирование → Категории» создавайте и редактируйте категории заявок. Для каждой категории можно выбрать иконку и цвет.",
      "Назначайте участников категорий — администраторов и исполнителей категории. Исполнители категории видят все заявки в своей категории.",
    ],
  },
  {
    title: "Полный доступ",
    content: [
      "Администратор видит все заявки во всех категориях и может назначать исполнителей, менять статусы и редактировать любые заявки.",
      "Удаление пользователей и категорий доступно только глобальным администраторам.",
    ],
  },
];

function GuideSectionCard({ section }: { section: GuideSection }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors text-left"
      >
        <h3 className="font-medium text-sm">{section.title}</h3>
        <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-2">
          {section.content.map((text, i) => (
            <p key={i} className="text-sm text-muted-foreground leading-relaxed">
              {text}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function FaqItem({
  faq,
  isAdmin,
  onEdit,
  onDelete,
}: {
  faq: FAQ;
  isAdmin: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors text-left"
      >
        <h3 className="font-medium text-sm flex-1 pr-2">{faq.question}</h3>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="px-4 pb-4">
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
            {faq.answer}
          </p>
          {isAdmin && (
            <div className="flex gap-2 mt-3">
              <Button size="sm" variant="outline" onClick={onEdit}>
                <Pencil className="h-3 w-3 mr-1" />
                Редактировать
              </Button>
              <Button size="sm" variant="destructive" onClick={onDelete}>
                <Trash2 className="h-3 w-3 mr-1" />
                Удалить
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Knowledge() {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: categories = [], isLoading } = useCategories();
  const { role } = useAuth();
  const { data: faqs = [] } = useFaqs();
  const deleteFaq = useDeleteFaq();
  const [faqDialogOpen, setFaqDialogOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);
  const [deletingFaqId, setDeletingFaqId] = useState<string | null>(null);

  const isAdmin = role === "admin";

  const guideBlocks = [
    { title: "Общая инструкция", icon: BookOpen, sections: generalGuide, roles: ["user", "executor", "admin"] },
    { title: "Инструкция для исполнителя", icon: UserCog, sections: executorGuide, roles: ["executor", "admin"] },
    { title: "Инструкция для администратора", icon: Shield, sections: adminGuide, roles: ["admin"] },
  ];

  const visibleGuides = guideBlocks.filter(g => role && g.roles.includes(role));

  const filterSections = (sections: GuideSection[]) => {
    if (!searchQuery.trim()) return sections;
    const q = searchQuery.toLowerCase();
    return sections.filter(
      s => s.title.toLowerCase().includes(q) || s.content.some(c => c.toLowerCase().includes(q))
    );
  };

  const filteredFaqs = searchQuery.trim()
    ? faqs.filter(
        (f) =>
          f.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          f.answer.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : faqs;

  // Group FAQs by category
  const faqsByCategory = new Map<string | null, FAQ[]>();
  filteredFaqs.forEach((faq) => {
    const key = faq.category_id;
    if (!faqsByCategory.has(key)) faqsByCategory.set(key, []);
    faqsByCategory.get(key)!.push(faq);
  });

  const getCategoryName = (id: string | null) => {
    if (!id) return "Общие вопросы";
    return categories.find((c) => c.id === id)?.name || "Без категории";
  };

  const handleDeleteFaq = async () => {
    if (!deletingFaqId) return;
    try {
      await deleteFaq.mutateAsync(deletingFaqId);
      toast.success("Вопрос удалён");
    } catch {
      toast.error("Ошибка при удалении");
    }
    setDeletingFaqId(null);
  };

  return (
    <Layout title="База знаний">
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-4 py-6">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <BookOpen className="h-8 w-8 text-primary" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">База знаний</h1>
            <p className="text-muted-foreground mt-2">
              Найдите ответы на частые вопросы
            </p>
          </div>
          
          <div className="max-w-md mx-auto relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по инструкциям и FAQ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 touch-target"
            />
          </div>
        </div>

        {/* Dynamic Categories from DB */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Категории заявок</h2>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Загрузка...</p>
          ) : categories.length === 0 ? (
            <p className="text-sm text-muted-foreground">Категории ещё не созданы</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {categories.map((cat) => {
                const Icon = getIcon(cat.icon);
                const colorClass = getColor(cat.color);
                return (
                  <Card key={cat.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 text-center">
                      <div className={`h-12 w-12 rounded-xl ${colorClass} flex items-center justify-center mx-auto mb-3`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <h3 className="font-medium text-sm">{cat.name}</h3>
                      {cat.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{cat.description}</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* FAQ Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MessageCircleQuestion className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Часто задаваемые вопросы</h2>
            </div>
            {isAdmin && (
              <Button
                size="sm"
                onClick={() => {
                  setEditingFaq(null);
                  setFaqDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                Добавить
              </Button>
            )}
          </div>

          {filteredFaqs.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                {searchQuery ? "Ничего не найдено" : "Вопросы ещё не добавлены"}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {Array.from(faqsByCategory.entries()).map(([catId, catFaqs]) => (
                <div key={catId || "general"}>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    {getCategoryName(catId)}
                  </h3>
                  <Card>
                    <CardContent className="p-0">
                      {catFaqs.map((faq) => (
                        <FaqItem
                          key={faq.id}
                          faq={faq}
                          isAdmin={isAdmin}
                          onEdit={() => {
                            setEditingFaq(faq);
                            setFaqDialogOpen(true);
                          }}
                          onDelete={() => setDeletingFaqId(faq.id)}
                        />
                      ))}
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User Guides */}
        {visibleGuides.map((guide) => {
          const Icon = guide.icon;
          const filtered = filterSections(guide.sections);
          if (searchQuery && filtered.length === 0) return null;
          return (
            <div key={guide.title}>
              <div className="flex items-center gap-2 mb-4">
                <Icon className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">{guide.title}</h2>
              </div>
              <Card>
                <CardContent className="p-0">
                  {filtered.map((section, i) => (
                    <GuideSectionCard key={i} section={section} />
                  ))}
                  {filtered.length === 0 && (
                    <p className="p-4 text-sm text-muted-foreground">Ничего не найдено</p>
                  )}
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>

      {/* FAQ Dialog */}
      <FaqManageDialog
        open={faqDialogOpen}
        onOpenChange={setFaqDialogOpen}
        faq={editingFaq}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingFaqId} onOpenChange={(open) => !open && setDeletingFaqId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить вопрос?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteFaq}>Удалить</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
