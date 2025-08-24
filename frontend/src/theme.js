import { extendTheme } from "@chakra-ui/react";
import { mode } from "@chakra-ui/theme-tools";

const fonts = {
  heading: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
  body: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
};

const colors = {
  brand: {
    50: '#eef2ff',
    100: '#e0e7ff',
    200: '#c7d2fe',
    300: '#a5b4fc',
    400: '#818cf8',
    500: '#6366f1',
    600: '#4f46e5',
    700: '#4338ca',
    800: '#3730a3',
    900: '#312e81',
  },
  accent: {
    100: '#fdf4ff',
    200: '#fae8ff',
    300: '#f5d0fe',
    400: '#e879f9',
    500: '#d946ef',
    600: '#c026d3',
    700: '#a21caf',
  },
};

const radii = {
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  '2xl': '28px',
  '3xl': '36px',
};

const shadows = {
  glow: '0 10px 25px -5px rgba(99,102,241,0.45), 0 8px 10px -6px rgba(99,102,241,0.35)',
  soft: '0 10px 30px rgba(0,0,0,0.15)',
  outlineBrand: '0 0 0 3px rgba(99, 102, 241, 0.3)'
};

const components = {
  Button: {
    baseStyle: {
      borderRadius: '12px',
      fontWeight: '600',
      transition: 'all .2s ease',
    },
    sizes: {
      md: {
        px: 5,
        py: 3,
      },
    },
    variants: {
      solid: {
        bg: 'brand.600',
        color: 'white',
        _hover: { bg: 'brand.700' },
        _active: { bg: 'brand.800' },
      },
      outline: {
        borderColor: 'brand.600',
        color: 'brand.600',
        _hover: { bg: 'brand.50' },
      },
      gradient: {
        bgGradient: 'linear(to-r, brand.600, accent.500)',
        color: 'white',
        _hover: { filter: 'brightness(1.05)' },
        _active: { filter: 'brightness(.95)' },
        boxShadow: 'glow',
      },
      ghostElevated: {
        bg: 'transparent',
        color: mode('gray.700', 'gray.100'),
        _hover: { bg: mode('gray.100', 'whiteAlpha.100'), transform: 'translateY(-1px)' },
        _active: { transform: 'translateY(0)' },
      },
    },
  },
  Input: {
    variants: {
      outline: (props) => ({
        field: {
          borderRadius: '12px',
          _focusVisible: {
            borderColor: 'brand.400',
            boxShadow: shadows.outlineBrand,
          },
        },
      }),
    },
  },
  Modal: {
    baseStyle: (props) => ({
      dialog: {
        borderRadius: '2xl',
        bg: mode('whiteAlpha.900', 'blackAlpha.700')(props),
        backdropFilter: 'blur(12px) saturate(120%)',
        border: '1px solid',
        borderColor: mode('blackAlpha.100', 'whiteAlpha.200')(props),
        boxShadow: shadows.soft,
      },
    }),
  },
  Tabs: {
    variants: {
      softRounded: (props) => ({
        tab: {
          borderRadius: 'full',
          _selected: {
            bg: mode('brand.100', 'whiteAlpha.200')(props),
            color: mode('brand.700', 'brand.200')(props),
          },
        },
      }),
    },
  },
  Tooltip: {
    baseStyle: (props) => ({
      bg: mode('gray.800', 'whiteAlpha.200')(props),
      color: mode('white', 'gray.100')(props),
      backdropFilter: 'blur(6px) saturate(140%)',
      border: '1px solid',
      borderColor: 'whiteAlpha.200',
    }),
  },
};

const styles = {
  global: (props) => ({
    'html, body, #root': {
      height: '100%',
    },
    body: {
      bg: mode(
        'linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)',
        'radial-gradient(1000px 600px at 10% 0%, rgba(79,70,229,.25) 0%, rgba(0,0,0,0) 40%), linear-gradient(180deg, #0b1020 0%, #0e1325 100%)'
      )(props),
      color: mode('gray.800', 'gray.100')(props),
      backgroundAttachment: 'fixed',
    },
    '::selection': {
      background: mode('brand.200', 'brand.700')(props),
      color: mode('gray.900', 'white')(props),
    },
  }),
};

// Proper Chakra color mode configuration
const config = {
  initialColorMode: 'system',
  useSystemColorMode: true,
};

const layerStyles = {
  card: {
    borderRadius: '2xl',
    bg: 'whiteAlpha.900',
    _dark: { bg: 'blackAlpha.600' },
    border: '1px solid',
    borderColor: 'whiteAlpha.300',
    boxShadow: 'soft',
    backdropFilter: 'blur(8px) saturate(120%)',
  },
  glass: {
    borderRadius: '2xl',
    bg: 'whiteAlpha.700',
    _dark: { bg: 'blackAlpha.500' },
    border: '1px solid',
    borderColor: 'whiteAlpha.200',
    backdropFilter: 'blur(10px) saturate(180%)',
  },
  surface: {
    borderRadius: 'xl',
    bg: mode('gray.50', 'whiteAlpha.100'),
  },
};

const textStyles = {
  headline: { fontSize: ['2xl', '3xl'], fontWeight: 800 },
  subtle: { color: 'gray.500', _dark: { color: 'gray.400' } },
};

const theme = extendTheme({ fonts, colors, radii, shadows, components, styles, config, layerStyles, textStyles });

export default theme;
