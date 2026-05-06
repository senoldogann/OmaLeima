import { useLocalSearchParams } from "expo-router";

import { AnnouncementDetailScreen } from "@/features/announcements/announcement-detail-screen";

export default function ClubAnnouncementDetailRoute() {
    const params = useLocalSearchParams<{ announcementId?: string; returnTo?: string }>();

    return (
        <AnnouncementDetailScreen
            announcementId={typeof params.announcementId === "string" ? params.announcementId : null}
            backHref="/club/announcements"
            returnTo={typeof params.returnTo === "string" ? params.returnTo : null}
        />
    );
}
