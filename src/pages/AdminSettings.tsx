import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { 
  Bell, 
  Mail, 
  MessageSquare,
  Clock,
  Shield,
  Database,
  Save
} from "lucide-react";
import { toast } from "sonner";

export default function AdminSettings() {
  const [settings, setSettings] = useState({
    // Notifications
    emailNotifications: true,
    telegramNotifications: false,
    pushNotifications: true,
    
    // Tickets
    autoAssign: false,
    defaultSLA: 24,
    allowAnonymous: false,
    
    // System
    maintenanceMode: false,
    debugMode: false,
    telegramBotToken: "",
  });

  const handleSave = () => {
    toast.success("Настройки сохранены");
  };

  return (
    <Layout title="Настройки системы">
      <div className="container mx-auto px-4 py-6 space-y-6 max-w-4xl">
        {/* Notifications Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Уведомления
            </CardTitle>
            <CardDescription>
              Настройте способы отправки уведомлений пользователям
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Email уведомления</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Отправлять уведомления на email пользователей
                </p>
              </div>
              <Switch
                checked={settings.emailNotifications}
                onCheckedChange={(checked) => 
                  setSettings({ ...settings, emailNotifications: checked })
                }
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Telegram уведомления</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Отправлять уведомления через Telegram Bot
                </p>
              </div>
              <Switch
                checked={settings.telegramNotifications}
                onCheckedChange={(checked) => 
                  setSettings({ ...settings, telegramNotifications: checked })
                }
              />
            </div>

            {settings.telegramNotifications && (
              <div className="pl-6 space-y-2">
                <label className="text-sm font-medium">Telegram Bot Token</label>
                <Input
                  type="password"
                  placeholder="Введите токен бота..."
                  value={settings.telegramBotToken}
                  onChange={(e) => 
                    setSettings({ ...settings, telegramBotToken: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Получите токен у @BotFather в Telegram
                </p>
              </div>
            )}
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Push уведомления</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Браузерные push-уведомления для веб-версии
                </p>
              </div>
              <Switch
                checked={settings.pushNotifications}
                onCheckedChange={(checked) => 
                  setSettings({ ...settings, pushNotifications: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Tickets Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Заявки
            </CardTitle>
            <CardDescription>
              Настройки обработки заявок
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="font-medium">Автоматическое назначение</span>
                <p className="text-sm text-muted-foreground">
                  Автоматически назначать заявки на доступных исполнителей
                </p>
              </div>
              <Switch
                checked={settings.autoAssign}
                onCheckedChange={(checked) => 
                  setSettings({ ...settings, autoAssign: checked })
                }
              />
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <label className="font-medium">SLA по умолчанию (часов)</label>
              <Input
                type="number"
                min={1}
                value={settings.defaultSLA}
                onChange={(e) => 
                  setSettings({ ...settings, defaultSLA: parseInt(e.target.value) || 24 })
                }
                className="max-w-[200px]"
              />
              <p className="text-sm text-muted-foreground">
                Время на решение заявки по умолчанию
              </p>
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="font-medium">Анонимные заявки</span>
                <p className="text-sm text-muted-foreground">
                  Разрешить создание заявок без авторизации
                </p>
              </div>
              <Switch
                checked={settings.allowAnonymous}
                onCheckedChange={(checked) => 
                  setSettings({ ...settings, allowAnonymous: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* System Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Система
            </CardTitle>
            <CardDescription>
              Системные настройки и обслуживание
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="font-medium">Режим обслуживания</span>
                <p className="text-sm text-muted-foreground">
                  Временно закрыть доступ к системе для пользователей
                </p>
              </div>
              <Switch
                checked={settings.maintenanceMode}
                onCheckedChange={(checked) => 
                  setSettings({ ...settings, maintenanceMode: checked })
                }
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="font-medium">Режим отладки</span>
                <p className="text-sm text-muted-foreground">
                  Включить расширенное логирование для отладки
                </p>
              </div>
              <Switch
                checked={settings.debugMode}
                onCheckedChange={(checked) => 
                  setSettings({ ...settings, debugMode: checked })
                }
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center gap-4">
              <Button variant="outline">
                <Database className="h-4 w-4 mr-2" />
                Экспорт данных
              </Button>
              <Button variant="outline">
                Очистить кэш
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} size="lg">
            <Save className="h-4 w-4 mr-2" />
            Сохранить настройки
          </Button>
        </div>
      </div>
    </Layout>
  );
}
