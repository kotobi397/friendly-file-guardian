import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Megaphone, Sparkles, Bell, Palette, BookOpen, Moon, SkipForward } from '@/components/icons/kotobi-lucide';
import { ReactionIcon, KOTOBI_REACTION_ICONS } from '@/components/notifications/KotobiReactionIcons';

const STORAGE_KEY = 'kotobi_whats_new_seen_v2';

type Step = {
  id: string;
  title: string;
  description: string;
  render?: () => React.ReactNode;
  icon: React.ReactNode;
};

const STEPS: Step[] = [
  {
    id: 'colors',
    title: 'ألوان جديدة مريحة للعين',
    description:
      'غيّرنا خلفية الموقع بالكامل إلى لون ورقي دافئ في الوضع الفاتح ولون هادئ غير قاتم في الوضع المظلم، بدون أبيض ناصع يزعج العين أثناء القراءة الطويلة.',
    icon: <Palette className="h-6 w-6 !text-clash-gold" />,
  },
  {
    id: 'cards',
    title: 'خلفية موحّدة لكل البطاقات',
    description:
      'كل البطاقات والنوافذ العائمة في الموقع صارت بلون واحد منسجم: صفحة تفاصيل الكتاب، حسابي والمراجعات، القوائم الجانبية، التنبيهات وصفحة الدخول.',
    icon: <BookOpen className="h-6 w-6 !text-clash-gold" />,
  },
  {
    id: 'contrast',
    title: 'وضوح أفضل في الوضع المظلم',
    description:
      'زدنا الفرق بين خلفية الصفحة وخلفية البطاقات، فأصبحت كل بطاقة واضحة الحدود ومقروءة في الوضع المظلم كما في الفاتح.',
    icon: <Moon className="h-6 w-6 !text-clash-gold" />,
  },
  {
    id: 'icons',
    title: 'أيقونات كتبي الخاصة',
    description:
      'أنشأنا أيقونات خاصة بكتبي وأصلحنا أحجامها في قسم المكافآت وبقية الموقع، فلم تعد تظهر كبيرة أو غير متناسبة.',
    icon: <Sparkles className="h-6 w-6 !text-clash-gold" />,
  },
  {
    id: 'skip',
    title: 'زر «تخطي» في مكانه الصحيح',
    description:
      'نقلنا زر «تخطي» من قائمة التحديثات في الشريط الأعلى إلى نافذة التحديثات الرئيسية، بحيث تتخطى أي تحديث من مكانه الطبيعي.',
    icon: <SkipForward className="h-6 w-6 !text-clash-gold" />,
  },
  {
    id: 'design',
    title: 'تصميم جديد للإشعارات',
    description:
      'أعدنا تصميم نافذة الإشعارات بالكامل بلوحة داكنة وإطار ذهبي وفقاعات رسائل أنيقة، لتصبح أوضح وأجمل في الوضع الفاتح والمظلم.',
    icon: <Bell className="h-6 w-6 !text-clash-gold" />,
  },
  {
    id: 'updates',
    title: 'نافذة التحديثات بحلّة جديدة',
    description:
      'كل تحديث من فريق كتبي صار يظهر كرسالة مع شعار الفريق وتاريخها، لمتابعة أسهل لكل جديد في الموقع.',
    icon: <Megaphone className="h-6 w-6 !text-clash-gold" />,
  },
  {
    id: 'reactions',
    title: 'تفاعلات كتبي الخاصة',
    description:
      'أنشأنا أشكال تفاعل خاصة بكتبي يمكنك استخدامها للتفاعل مع التحديثات. اختر شكلًا واحدًا، وعند اختيار شكل آخر يُستبدل تلقائيًا.',
    icon: <Sparkles className="h-6 w-6 !text-clash-gold" />,
    render: () => (
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {Object.keys(KOTOBI_REACTION_ICONS).map((id) => (
          <span
            key={id}
            className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-clash-gold/50 bg-clash-deep"
          >
            <ReactionIcon id={id} className="h-6 w-6" />
          </span>
        ))}
      </div>
    ),
  },
];


const WhatsNewModal: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) !== '1') {
        const t = setTimeout(() => setOpen(true), 1200);
        return () => clearTimeout(t);
      }
    } catch {}
  }, []);

  const finish = () => {
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch {}
    setOpen(false);
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else finish();
  };

  const current = STEPS[step];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) finish(); }}>
      <DialogContent
        dir="rtl"
        className="max-w-sm rounded-2xl border-4 border-clash-gold bg-clash-panel p-0 overflow-hidden"
      >
        <div className="bg-clash-deep border-b-4 border-clash-gold px-4 py-3 text-center">
          <h2 className="text-lg font-bold !text-clash-gold">ما الجديد في كتبي؟</h2>
        </div>

        <div className="px-5 py-5">
          <div className="rounded-2xl bg-clash-bubble p-4 text-center shadow-inner">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border-2 border-clash-gold bg-clash-deep">
              {current.icon}
            </div>
            <h3 className="mb-2 text-base font-bold !text-clash-bubble-foreground">{current.title}</h3>
            <p className="text-sm leading-relaxed !text-clash-bubble-foreground">{current.description}</p>
            {current.render?.()}
          </div>

          <div className="mt-4 flex items-center justify-center gap-1.5">
            {STEPS.map((s, i) => (
              <span
                key={s.id}
                className={`h-2 rounded-full transition-all ${i === step ? 'w-6 bg-clash-gold' : 'w-2 bg-clash-gold/30'}`}
              />
            ))}
          </div>

          <div className="mt-4 flex gap-2">
            <Button
              variant="ghost"
              onClick={finish}
              className="flex-1 !text-clash-foreground hover:bg-clash-deep"
            >
              تخطي
            </Button>
            <Button
              onClick={next}
              className="flex-1 border-2 border-clash-gold-deep bg-clash-gold font-bold !text-clash-bubble-foreground hover:bg-clash-gold/90"
            >
              {step < STEPS.length - 1 ? 'التالي' : 'تمام!'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WhatsNewModal;
