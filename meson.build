project('tree-sitter-meson', 'c')
tree_sitter_meson_lib = static_library(
    'TreeSitterMeson',
    'src/parser.c',
    include_directories: [include_directories('src')],
    generate_umbrella: true,
    umbrella_path: 'src',
)
tree_sitter_meson_dep = declare_dependency(link_with: tree_sitter_meson_lib, include_directories: [include_directories('src')])
