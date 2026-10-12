-- توقيت إنجاز المهمة — يُستخدم لتصنيف المهام المنجزة زمنياً (الأسبوع الماضي / المدة السابقة).
alter table public.tasks add column completed_at timestamptz;
