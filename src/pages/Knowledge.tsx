import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  BookOpen, 
  Laptop, 
  Users, 
  Calculator, 
  Building, 
  Shield,
  ChevronRight
} from "lucide-react";
import { useState } from "react";

const categories = [
  { 
    id: '1', 
    name: 'IT-поддержка', 
    icon: Laptop, 
    articlesCount: 24,
    color: 'bg-blue-500'
  },
  { 
    id: '2', 
    name: 'HR', 
    icon: Users, 
    articlesCount: 15,
    color: 'bg-purple-500'
  },
  { 
    id: '3', 
    name: 'Бухгалтерия', 
    icon: Calculator, 
    articlesCount: 18,
    color: 'bg-green-500'
  },
  { 
    id: '4', 
    name: 'АХО', 
    icon: Building, 
    articlesCount: 12,
    color: 'bg-orange-500'
  },
  { 
    id: '5', 
    name: 'Безопасность', 
    icon: Shield, 
    articlesCount: 8,
    color: 'bg-red-500'
  },
];

const popularArticles = [
  { 
    id: '1', 
    title: 'Как сбросить пароль от учетной записи?', 
    category: 'IT-поддержка',
    views: 1250 
  },
  { 
    id: '2', 
    title: 'Оформление заявления на отпуск', 
    category: 'HR',
    views: 890 
  },
  { 
    id: '3', 
    title: 'Подключение к корпоративному VPN', 
    category: 'IT-поддержка',
    views: 756 
  },
  { 
    id: '4', 
    title: 'Заказ канцелярских принадлежностей', 
    category: 'АХО',
    views: 534 
  },
  { 
    id: '5', 
    title: 'Получение справки 2-НДФЛ', 
    category: 'Бухгалтерия',
    views: 478 
  },
];

export default function Knowledge() {
  const [searchQuery, setSearchQuery] = useState("");

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
          
          {/* Search */}
          <div className="max-w-md mx-auto relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по статьям..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 touch-target"
            />
          </div>
        </div>

        {/* Categories */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Категории</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <Card 
                  key={category.id} 
                  className="cursor-pointer hover:shadow-medium transition-shadow"
                >
                  <CardContent className="p-4 text-center">
                    <div className={`h-12 w-12 rounded-xl ${category.color} flex items-center justify-center mx-auto mb-3`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="font-medium text-sm">{category.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {category.articlesCount} статей
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Popular articles */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Популярные статьи</h2>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {popularArticles.map((article) => (
                  <div 
                    key={article.id}
                    className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm truncate">
                        {article.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {article.category}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {article.views} просмотров
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
