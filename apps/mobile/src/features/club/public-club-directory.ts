import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

export type PublicClubDirectoryItem = {
    address: string | null;
    announcement: string | null;
    city: string | null;
    clubId: string;
    clubName: string;
    contactEmail: string | null;
    country: string | null;
    coverImageUrl: string | null;
    instagramUrl: string | null;
    logoUrl: string | null;
    phone: string | null;
    universityName: string | null;
    websiteUrl: string | null;
};

type ClubRow = {
    address: string | null;
    announcement: string | null;
    city: string | null;
    contact_email: string | null;
    country: string | null;
    cover_image_url: string | null;
    id: string;
    instagram_url: string | null;
    logo_url: string | null;
    name: string;
    phone: string | null;
    university_name: string | null;
    website_url: string | null;
};

type UsePublicClubDirectoryQueryParams = {
    isEnabled: boolean;
};

export const publicClubDirectoryQueryKey = ["public-club-directory"] as const;

const fetchPublicClubDirectoryAsync = async (): Promise<PublicClubDirectoryItem[]> => {
    const { data, error } = await supabase
        .from("clubs")
        .select("id,name,city,country,university_name,logo_url,cover_image_url,announcement,contact_email,phone,address,website_url,instagram_url")
        .eq("status", "ACTIVE")
        .order("name", { ascending: true })
        .returns<ClubRow[]>();

    if (error !== null) {
        throw new Error(`Failed to load public club directory: ${error.message}`);
    }

    return data.map((club) => ({
        address: club.address,
        announcement: club.announcement,
        city: club.city,
        clubId: club.id,
        clubName: club.name,
        contactEmail: club.contact_email,
        country: club.country,
        coverImageUrl: club.cover_image_url,
        instagramUrl: club.instagram_url,
        logoUrl: club.logo_url,
        phone: club.phone,
        universityName: club.university_name,
        websiteUrl: club.website_url,
    }));
};

export const usePublicClubDirectoryQuery = ({
    isEnabled,
}: UsePublicClubDirectoryQueryParams): UseQueryResult<PublicClubDirectoryItem[], Error> =>
    useQuery({
        queryKey: publicClubDirectoryQueryKey,
        queryFn: fetchPublicClubDirectoryAsync,
        enabled: isEnabled,
        staleTime: 1000 * 60 * 5,
    });
