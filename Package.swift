// swift-tools-version: 5.7
import PackageDescription

let package = Package(
    name: "TreeSitterMeson",
    products: [
        .library(name: "TreeSitterMeson", targets: ["TreeSitterMeson"]),
    ],
    dependencies: [],
    targets: [
        .target(name: "TreeSitterMeson",
                path: ".",
                exclude: [
                    "binding.gyp",
                    "bindings",
                    "Cargo.toml",
                    "corpus",
                    "grammar.js",
                    "LICENSE",
                    "Makefile",
                    "package.json",
                    "README.md",
                    "script",
                    "src/grammar.json",
                    "src/node-types.json",
                ],
                sources: [
                    "src/parser.c",
                ],
                resources: [
                    .copy("queries")
                ],
                publicHeadersPath: "bindings/swift",
                cSettings: [.headerSearchPath("src")])
    ]
)
