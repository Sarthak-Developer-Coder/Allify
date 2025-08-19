import { extendTheme } from "@chakra-ui/react";

const colors = {
  brand: {
    50: "#f5e9ff",
    100: "#e8d0ff",
    200: "#d2a8ff",
    300: "#bd80ff",
    400: "#a758ff",
    500: "#9130ff",
    600: "#741fcc",
    700: "#571799",
    800: "#3a0f66",
    900: "#1d0833",
  },
  IconButton: {
    baseStyle: {
      borderRadius: "xl",
      transition: "all 250ms cubic-bezier(0.2, 0.8, 0.2, 1)",
      _focusVisible: { boxShadow: "0 0 0 3px rgba(145,48,255,0.35)" },
    },
    variants: {
      solid: (props) => ({
        bg: props.colorMode === 'dark' ? 'whiteAlpha.200' : 'gray.200',
        _hover: { transform: 'translateY(-2px)', bg: props.colorMode === 'dark' ? 'whiteAlpha.300' : 'gray.300' },
        _active: { transform: 'translateY(0) scale(0.98)' },
      }),
      ghost: (props) => ({
        _hover: { bg: props.colorMode === 'dark' ? 'whiteAlpha.200' : 'blackAlpha.100' },
      }),
    },
    defaultProps: { variant: 'solid' },
  },
  accent: {
    400: "#38bdf8",
    500: "#0ea5e9",
    600: "#0284c7",
  },
  success: { 500: "#22c55e" },
  warning: { 500: "#f59e0b" },
  danger: { 500: "#ef4444" },
};

const styles = {
  global: (props) => ({
    "html, body, #root": {
      height: "100%",
    },
    body: {
      bg: props.colorMode === "dark" ? "gray.900" : "gray.50",
      backgroundImage:
        props.colorMode === "dark"
          ? "radial-gradient(1200px 600px at 10% 10%, rgba(145,48,255,0.15), transparent), radial-gradient(1000px 500px at 90% 30%, rgba(56,189,248,0.15), transparent)"
          : "radial-gradient(1200px 600px at 10% 10%, rgba(145,48,255,0.12), transparent), radial-gradient(1000px 500px at 90% 30%, rgba(56,189,248,0.12), transparent)",
    },
    "*": { outlineOffset: "2px" },
    
    // Smooth scroll & selection
    html: { scrollBehavior: "smooth" },
    "::selection": {
      background: "brand.500",
      color: "white",
    },
  }),
};

const components = {
  Button: {
    baseStyle: {
      borderRadius: "xl",
      fontWeight: 700,
      letterSpacing: "0.2px",
      transition: "all 300ms cubic-bezier(0.2, 0.8, 0.2, 1)",
      _focusVisible: { boxShadow: "0 0 0 3px rgba(145,48,255,0.4)" },
    },
    sizes: {
  md: { h: 12, px: 6, fontSize: "md" },
  lg: { h: 14, px: 7, fontSize: "lg" },
  xl: { h: 16, px: 8, fontSize: "xl", borderRadius: "full" },
    },
    variants: {
      solid: (props) => ({
        bgGradient:
          props.colorMode === "dark"
            ? "linear(to-r, brand.500, accent.500)"
            : "linear(to-r, brand.400, accent.400)",
        color: "white",
        boxShadow: "0 10px 20px -10px rgba(145,48,255,0.6), 0 6px 8px -6px rgba(14,165,233,0.5)",
        _hover: {
          transform: "translateY(-2px) scale(1.02)",
          boxShadow: "0 16px 30px -10px rgba(145,48,255,0.7), 0 10px 14px -8px rgba(14,165,233,0.55)",
          filter: "saturate(1.1)",
        },
        _active: { transform: "translateY(0) scale(0.98)", boxShadow: "lg" },
      }),
      outline: (props) => ({
        borderWidth: 2,
        borderColor: props.colorMode === "dark" ? "whiteAlpha.300" : "blackAlpha.300",
        color: props.colorMode === "dark" ? "whiteAlpha.900" : "gray.800",
        _hover: {
          borderColor: "transparent",
          bg: props.colorMode === "dark" ? "whiteAlpha.100" : "blackAlpha.50",
          boxShadow: "0 0 0 3px rgba(145,48,255,0.35)",
        },
        _active: { transform: "translateY(0) scale(0.98)" },
      }),
      ghost: (props) => ({
        bg: props.colorMode === "dark" ? "whiteAlpha.100" : "blackAlpha.50",
        _hover: { bg: props.colorMode === "dark" ? "whiteAlpha.200" : "blackAlpha.100" },
      }),
      subtle: (props) => ({
        bg: props.colorMode === "dark" ? "whiteAlpha.100" : "gray.100",
        color: props.colorMode === "dark" ? "white" : "gray.800",
        _hover: { bg: props.colorMode === "dark" ? "whiteAlpha.200" : "gray.200" },
        _active: { transform: "translateY(0) scale(0.98)" },
      }),
      danger: {
        bg: "danger.500",
        color: "white",
        _hover: { filter: "brightness(1.1)", transform: "translateY(-2px)" },
      },
      link: {
        color: "brand.400",
        _hover: { textDecoration: "none", color: "brand.300" },
      },
    },
  defaultProps: { colorScheme: "brand", size: "lg", variant: "solid" },
  },
  Input: {
    variants: {
      filled: (props) => ({
        field: {
          bg: props.colorMode === "dark" ? "whiteAlpha.100" : "gray.100",
          _hover: { bg: props.colorMode === "dark" ? "whiteAlpha.200" : "gray.200" },
          borderRadius: "lg",
          borderWidth: 1,
          borderColor: props.colorMode === "dark" ? "whiteAlpha.200" : "blackAlpha.200",
          transition: "all .2s",
          _focusVisible: { borderColor: "brand.400", boxShadow: "0 0 0 3px rgba(145,48,255,0.25)" },
        },
      }),
    },
    defaultProps: { variant: "filled" },
  },
  Select: {
    baseStyle: { field: { borderRadius: "lg" } },
    defaultProps: { variant: "filled" },
  },
  Tooltip: {
    baseStyle: { borderRadius: "md", bg: "blackAlpha.800" },
  },
  Card: {
    baseStyle: { borderRadius: "2xl", backdropFilter: "blur(8px)" },
  },
  Box: {
    variants: {
      glass: {
        bg: "whiteAlpha.100",
        border: "1px solid",
        borderColor: "whiteAlpha.200",
        backdropFilter: "blur(10px)",
      },
    },
  },
  Modal: {
    baseStyle: {
      dialog: { borderRadius: "2xl", bg: "rgba(16,18,24,0.95)", backdropFilter: "blur(8px)" },
    },
  },
  Tabs: {
    variants: {
      softRounded: (props) => ({
        tab: {
          _selected: {
            bg: props.colorMode === "dark" ? "whiteAlpha.200" : "gray.200",
            color: "brand.400",
          },
        },
      }),
    },
    defaultProps: { variant: "soft-rounded", colorScheme: "brand" },
  },
  Badge: {
    baseStyle: { borderRadius: "full", px: 2, py: 0.5, fontWeight: 700 },
  },
  Tag: {
    baseStyle: { borderRadius: "full", fontWeight: 700 },
  },
  Switch: {
    baseStyle: {
      track: { _checked: { bg: "brand.500" } },
    },
  },
  Progress: {
    baseStyle: { track: { borderRadius: "full" }, filledTrack: { borderRadius: "full" } },
  },
};

const config = {
  initialColorMode: "dark",
  useSystemColorMode: false,
};

const theme = extendTheme({ colors, styles, components, config, fonts: {
  heading: 'Baloo 2, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial',
  body: 'Poppins, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial',
}});

export default theme;
