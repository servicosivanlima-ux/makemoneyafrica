-- ============================================
-- ADMIN CAMPAIGN UPDATES
-- ============================================

CREATE OR REPLACE FUNCTION public.admin_update_campaign(
    p_campaign_id UUID,
    p_page_link TEXT,
    p_video_link TEXT DEFAULT NULL,
    p_video_title TEXT DEFAULT NULL,
    p_video_duration INTEGER DEFAULT NULL,
    p_video_id TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_admin BOOLEAN;
BEGIN
    -- Security check: only admins
    IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
        RAISE EXCEPTION 'Acesso negado. Apenas administradores podem editar campanhas.';
    END IF;

    -- Update campaign
    UPDATE public.campaigns
    SET
        page_link = p_page_link,
        video_link = p_video_link,
        video_title = p_video_title,
        video_duration = p_video_duration,
        video_id = p_video_id,
        updated_at = now()
    WHERE id = p_campaign_id;

    RETURN TRUE;
END;
$$;
