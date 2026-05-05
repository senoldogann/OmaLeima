import type { ComponentProps } from "react";
import { Platform } from "react-native";

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolView, type SymbolViewProps } from "expo-symbols";

type TabIconName = {
    ios: SymbolViewProps["name"];
    android: string;
    web: string;
};

type TabIconProps = {
    name: TabIconName;
    color: string;
    size: number;
    focused: boolean;
};

// iOS: SF Symbols (SymbolView) ile animasyonlu ikonlar
// Android/Web: MaterialIcons ile aynı görsel anlam korunur
export const TabIcon = ({ name, color, size, focused }: TabIconProps) => {
    if (Platform.OS === "ios") {
        return (
            <SymbolView
                animationSpec={
                    focused
                        ? {
                            effect: {
                                type: "bounce",
                                wholeSymbol: true,
                            },
                            speed: 0.9,
                        }
                        : undefined
                }
                name={name.ios}
                size={size}
                tintColor={color}
                type="hierarchical"
            />
        );
    }

    return (
        <MaterialIcons
            color={color}
            name={name.android as ComponentProps<typeof MaterialIcons>["name"]}
            size={size}
        />
    );
};
