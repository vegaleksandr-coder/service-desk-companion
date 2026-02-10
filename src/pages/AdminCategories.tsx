import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Search, 
  MoreHorizontal, 
  Plus, 
  Pencil, 
  Trash2,
  FolderOpen,
  Monitor,
  Wifi,
  Mail,
  Printer,
  HelpCircle,
  Palette,
  Users
} from "lucide-react";
import { CategoryMembersDialog } from "@/components/CategoryMembersDialog";
import { mockCategories } from "@/data/mockData";
import { Category } from "@/types/ticket";
import { toast } from "sonner";

const iconOptions = [
  { value: "monitor", label: "Монитор", icon: Monitor },
  { value: "wifi", label: "Wi-Fi", icon: Wifi },
  { value: "mail", label: "Почта", icon: Mail },
  { value: "printer", label: "Принтер", icon: Printer },
  { value: "help", label: "Справка", icon: HelpCircle },
  { value: "folder", label: "Папка", icon: FolderOpen },
];

const colorOptions = [
  { value: "blue", label: "Синий", class: "bg-blue-500" },
  { value: "green", label: "Зелёный", class: "bg-green-500" },
  { value: "orange", label: "Оранжевый", class: "bg-orange-500" },
  { value: "purple", label: "Фиолетовый", class: "bg-purple-500" },
  { value: "red", label: "Красный", class: "bg-red-500" },
  { value: "teal", label: "Бирюзовый", class: "bg-teal-500" },
];

const getIconComponent = (iconName?: string) => {
  const found = iconOptions.find(i => i.value === iconName);
  return found ? found.icon : FolderOpen;
};

const getColorClass = (colorName?: string) => {
  const found = colorOptions.find(c => c.value === colorName);
  return found ? found.class : "bg-primary";
};

const CategoryForm = ({ 
  data, 
  onChange 
}: { 
  data: Partial<Category>; 
  onChange: (data: Partial<Category>) => void;
}) => (
  <div className="space-y-4 py-4">
    <div className="space-y-2">
      <label className="text-sm font-medium">Название *</label>
      <Input
        placeholder="Техническая поддержка"
        value={data.name || ""}
        onChange={(e) => onChange({ ...data, name: e.target.value })}
      />
    </div>
    <div className="space-y-2">
      <label className="text-sm font-medium">Описание</label>
      <Textarea
        placeholder="Описание категории..."
        value={data.description || ""}
        onChange={(e) => onChange({ ...data, description: e.target.value })}
        rows={3}
      />
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Иконка</label>
        <div className="flex flex-wrap gap-2">
          {iconOptions.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange({ ...data, icon: opt.value })}
                className={`p-2 rounded-lg border-2 transition-colors ${
                  data.icon === opt.value 
                    ? "border-primary bg-primary/10" 
                    : "border-border hover:border-primary/50"
                }`}
                title={opt.label}
              >
                <Icon className="h-5 w-5" />
              </button>
            );
          })}
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Цвет</label>
        <div className="flex flex-wrap gap-2">
          {colorOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ ...data, color: opt.value })}
              className={`w-8 h-8 rounded-full ${opt.class} transition-all ${
                data.color === opt.value 
                  ? "ring-2 ring-offset-2 ring-primary" 
                  : "hover:scale-110"
              }`}
              title={opt.label}
            />
          ))}
        </div>
      </div>
    </div>
  </div>
);

export default function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>(mockCategories);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [deleteCategory, setDeleteCategory] = useState<Category | null>(null);
  const [membersCategory, setMembersCategory] = useState<Category | null>(null);
  const [newCategory, setNewCategory] = useState<Partial<Category>>({
    name: "",
    description: "",
    icon: "folder",
    color: "blue",
  });

  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cat.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddCategory = () => {
    if (!newCategory.name) {
      toast.error("Введите название категории");
      return;
    }
    
    const category: Category = {
      id: `cat-${Date.now()}`,
      name: newCategory.name,
      description: newCategory.description,
      icon: newCategory.icon,
      color: newCategory.color,
    };
    
    setCategories([...categories, category]);
    setNewCategory({ name: "", description: "", icon: "folder", color: "blue" });
    setIsAddDialogOpen(false);
    toast.success("Категория добавлена");
  };

  const handleUpdateCategory = () => {
    if (!editingCategory) return;
    
    setCategories(categories.map(c => 
      c.id === editingCategory.id ? editingCategory : c
    ));
    setIsEditDialogOpen(false);
    setEditingCategory(null);
    toast.success("Категория обновлена");
  };

  const handleDeleteCategory = () => {
    if (!deleteCategory) return;
    
    setCategories(categories.filter(c => c.id !== deleteCategory.id));
    setDeleteCategory(null);
    toast.success("Категория удалена");
  };

  return (
    <Layout title="Управление категориями">
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{categories.length}</div>
              <p className="text-xs text-muted-foreground">Всего категорий</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-status-in-progress">
                {categories.filter(c => c.icon === 'monitor').length}
              </div>
              <p className="text-xs text-muted-foreground">IT категорий</p>
            </CardContent>
          </Card>
          <Card className="col-span-2 md:col-span-1">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {colorOptions.length} цветов доступно
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Categories Table */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
              <CardTitle>Категории заявок</CardTitle>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Добавить категорию
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск категорий..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Категория</TableHead>
                    <TableHead>Описание</TableHead>
                    <TableHead>Цвет</TableHead>
                    <TableHead className="w-[70px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCategories.map((category) => {
                    const Icon = getIconComponent(category.icon);
                    return (
                      <TableRow key={category.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                            <div className={`h-9 w-9 rounded-lg ${getColorClass(category.color)} flex items-center justify-center`}>
                              <Icon className="h-4 w-4 text-white" />
                            </div>
                            {category.name}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-[300px] truncate">
                          {category.description || "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded-full ${getColorClass(category.color)}`} />
                            <span className="text-sm text-muted-foreground capitalize">
                              {colorOptions.find(c => c.value === category.color)?.label || category.color}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => {
                                setEditingCategory(category);
                                setIsEditDialogOpen(true);
                              }}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Редактировать
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setMembersCategory(category)}>
                                <Users className="h-4 w-4 mr-2" />
                                Участники
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => setDeleteCategory(category)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Удалить
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {filteredCategories.map((category) => {
                const Icon = getIconComponent(category.icon);
                return (
                  <Card key={category.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-lg ${getColorClass(category.color)} flex items-center justify-center`}>
                            <Icon className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <p className="font-medium">{category.name}</p>
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {category.description || "Без описания"}
                            </p>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setEditingCategory(category);
                              setIsEditDialogOpen(true);
                            }}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Редактировать
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setMembersCategory(category)}>
                              <Users className="h-4 w-4 mr-2" />
                              Участники
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => setDeleteCategory(category)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Удалить
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {filteredCategories.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                Категории не найдены
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Category Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить категорию</DialogTitle>
            <DialogDescription>
              Создайте новую категорию для заявок
            </DialogDescription>
          </DialogHeader>
          <CategoryForm data={newCategory} onChange={setNewCategory} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleAddCategory}>
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактировать категорию</DialogTitle>
            <DialogDescription>
              Измените параметры категории
            </DialogDescription>
          </DialogHeader>
          {editingCategory && (
            <CategoryForm 
              data={editingCategory} 
              onChange={(data) => setEditingCategory({ ...editingCategory, ...data } as Category)} 
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleUpdateCategory}>
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteCategory} onOpenChange={() => setDeleteCategory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить категорию?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить категорию "{deleteCategory?.name}"? 
              Это действие нельзя отменить. Заявки с этой категорией останутся без изменений.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteCategory}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Category Members Dialog */}
      <CategoryMembersDialog
        categoryId={membersCategory?.id || null}
        categoryName={membersCategory?.name || ""}
        open={!!membersCategory}
        onOpenChange={(open) => !open && setMembersCategory(null)}
      />
    </Layout>
  );
}
