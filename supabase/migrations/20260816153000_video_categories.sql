ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'Entertainment';
CREATE INDEX IF NOT EXISTS videos_category_idx ON public.videos(category);
