INSERT INTO public.payment_modes (book_id, user_id, name)
SELECT b.id, b.user_id, m.name
FROM public.books b
CROSS JOIN (VALUES ('Cash'), ('Cheque')) AS m(name)
ON CONFLICT DO NOTHING;