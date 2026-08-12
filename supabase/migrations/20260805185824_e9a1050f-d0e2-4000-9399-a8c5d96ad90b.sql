CREATE OR REPLACE FUNCTION public.gam_get_user_badges(_user_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(x ORDER BY (x->>'sort_order')::int), '[]'::jsonb)
  FROM (
    SELECT jsonb_build_object(
      'item_id', si.id,
      'code', si.code,
      'title_ar', si.title_ar,
      'description_ar', si.description_ar,
      'preview_value', si.preview_value,
      'price_coins', si.price_coins,
      'sort_order', si.sort_order,
      'purchased_at', p.purchased_at,
      'is_selected', (ug.selected_badge IS NOT NULL AND ug.selected_badge = si.preview_value)
    ) AS x
    FROM public.user_shop_purchases p
    JOIN public.shop_items si ON si.id = p.shop_item_id
    LEFT JOIN public.user_gamification ug ON ug.user_id = p.user_id
    WHERE p.user_id = _user_id AND si.category = 'badge'
  ) t;
$$;

GRANT EXECUTE ON FUNCTION public.gam_get_user_badges(uuid) TO anon, authenticated, service_role;