module.exports = grammar({
  name: "meson",
  extras: ($) => [$._comment, /[\s\f\uFEFF\u2060\u200B]|\\\r?\n/, /[\s\p{Zs}\uFEFF\u2060\u200B]/],
  precedences: ($) => [[$.method_expression, $.binary_expression], [$.function_id, $.id_expression], [$.unary_expression, $.add_operator]],
  // Reference: <https://mesonbuild.com/Syntax.html>
  rules: {
    // this is tree-sitter's root file
    source_file: ($) => optional($.build_definition),

    // build_definition: (NEWLINE | statement)*
    build_definition: ($) => repeat1($._statement_without),

    // statement: (expression_statement | selection_statement | iteration_statement | assignment_statement) NEWLINE
    statement: ($) =>
      seq(
        $._statement_without,
        /*choice(
          $._comment,
          $.expression,
          $.selection_statement,
          $.iteration_statement,
          $.assignment_statement,
          $.jump_statement,
          $.expression,
        ),*/
        $._NEWLINE,
      ),
    _statement_without: ($) => choice($._comment,
          $.expression,
          $.selection_statement,
          $.iteration_statement,
          $.assignment_statement,
          $.jump_statement,
          $.expression,
	),
    // selection_statement: "if" condition NEWLINE (statement)* ("elif" condition NEWLINE (statement)*)* ["else" (statement)*] "endif"
    selection_statement: ($) =>
      seq(
        "if",
        $.condition,
        $._NEWLINE,
        repeat($.statement),
        repeat(seq("elif", $.condition, $._NEWLINE, repeat($.statement))),
        optional(seq("else", $._NEWLINE, repeat($.statement))),
        "endif",
      ),

    // iteration_statement: "foreach" identifier_list ":" id_expression NEWLINE (statement | jump_statement)* "endforeach"
    iteration_statement: ($) =>
      seq(
        "foreach",
        $.identifier_list,
        ":",
        $.expression,
        $._NEWLINE,
        repeat($.statement),
        "endforeach",
      ),

    // assignment_statement: expression asssignment_operator expression
    assignment_statement: ($) =>
      seq($.expression, $.assignment_operator, $.expression),

    // assignment_operator: "=" | "*=" | "/=" | "%=" | "+=" | "-="
    assignment_operator: ($) => choice("=", "*=", "/=", "%=", "+=", "-="),

    // jump_statement: ("break" | "continue") NEWLINE
    jump_statement: ($) => seq(choice("break", "continue")/*, $._NEWLINE*/),

    // condition: expression
    condition: ($) => $.expression,

    expression: ($) =>
      choice(
        $.function_expression,
        $.conditional_expression,
        $.unary_expression,
        $.subscript_expression,
        $.method_expression,
        $._literal,
        $.binary_expression,
        $.primary_expression,
      ),

    // function_expression: id_expression "(" [argument_list] ")"
    function_expression: ($) =>
      seq($.function_id, "(", optional($.argument_list), ")"),

    // argument_list: positional_arguments ["," keyword_arguments] | keyword_arguments
    // FIXME: this isn't strictly correct, as it accepts positional arguments
    // and keyword arguments in any order, rather than "positional argument first, then keyword arguments"
    argument_list: ($) =>
      seq(
        seq(
          choice($.keyword_item, $.expression)),
          optional(repeat(seq(",", choice($.keyword_item, $.expression)))
       ),
       optional(","),
     ),
    // keyword_item: id_expression ":" expression
    keyword_item: ($) => seq($.keyword_arg_key, ":", $.expression),

    // key_value_item: expression ":" expression
    key_value_item: ($) => seq($.expression, ":", $.expression),

    // key_value_list: key_value_item ("," key_value_item)*
    key_value_list: ($) =>
      seq($.key_value_item, repeat(seq(",", $.key_value_item))),

    method_expression: ($) =>
      prec.left(
        10000,
        seq(
          $.expression,
          ".",
          $.function_id,
          "(",
          optional($.argument_list),
          ")",
        ),
      ),

    subscript_expression: ($) =>
      prec.left(10000, seq($.expression, "[", $.expression, "]")),

    unary_expression: ($) =>
      choice(
        seq("not", $.expression),
        seq("!", $.expression),
        seq("-", $.expression),
      ),

    binary_expression: ($) =>
      choice(
        prec.left(6, seq($.expression, $.mult_operator, $.expression)),
        prec.left(5, seq($.expression, $.add_operator, $.expression)),
        prec.left(4, seq($.expression, $.equ_operator, $.expression)),
        prec.left(3, seq($.expression, $.rel_operator, $.expression)),
        prec.left(2, seq($.expression, "and", $.expression)),
        prec.left(1, seq($.expression, "or", $.expression)),
      ),

    add_operator: ($) => choice("+", "-"),
    mult_operator: ($) => choice("*", "/", "%"),
    equ_operator: ($) => choice("==", "!="),
    rel_operator: ($) => choice(">", "<", ">=", "<=", "in", seq("not", "in")),

    // conditional_expression: logical_or_expression | (logical_or_expression "?" expression ":" assignment_expression
    // (this is an error, there's no `assignment_expression` rule, since assignments
    // are not expressions in meson)
    conditional_expression: ($) =>
      prec.left(1, seq($.expression, "?", $.expression, ":", $.expression)),

    // literal: integer_literal | string_literal | boolean_literal | array_literal | dictionary_literal
    _literal: ($) =>
      choice(
        $.integer_literal,
        $.string_literal,
        $.boolean_literal,
        $.array_literal,
        $.dictionary_literal,
      ),

    // integer_literal: decimal_literal | octal_literal | hex_literal | binary_literal
    integer_literal: ($) =>
      choice(
        $._decimal_literal,
        $._octal_literal,
        $._hex_literal,
        $._binary_literal,
      ),

    // decimal_literal: DECIMAL_NUMBER
    _decimal_literal: ($) => $._DECIMAL_NUMBER,

    // DECIMAL_NUMBER: /[1-9][0-9]*/
    _DECIMAL_NUMBER: ($) => /[0-9]+/,

    // octal_literal: "0o" OCTAL_NUMBER
    _octal_literal: ($) => seq(choice("0o", "0O"), $._OCTAL_NUMBER),

    // OCTAL_NUMBER: /[0-7]+/
    _OCTAL_NUMBER: ($) => /[0-7]+/,

    // hex_literal: "0x" HEX_NUMBER
    _hex_literal: ($) => seq(choice("0x", "0X"), $._HEX_NUMBER),

    // HEX_NUMBER: /[a-fA-F0-9]+/
    _HEX_NUMBER: ($) => /[a-fA-F0-9]+/,

    _binary_literal: ($) => seq(choice("0b", "0B"), $._BINARY_NUMBER),
    _BINARY_NUMBER: ($) => /[01]+/,

    // string_literal: ("'" STRING_SIMPLE_VALUE "'") | ("'''" STRING_MULTILINE_VALUE "'''")
    // STRING_MULTILINE_VALUE: \.*?(''')\
    // STRING_SIMPLE_VALUE: \.*?(?<!\\)(\\\\)*?'\
    string_literal: ($) => choice($.string_simple, $.string_multiline, $.string_format),

    // shamelessly stolen from <https://github.com/tree-sitter/tree-sitter-c/>
    escape_sequence: ($) =>
      token(
        prec(
          1,
          seq(
            "\\",
            choice(
              /[^xuU]/,
              /\d{2,3}/,
              /x[0-9a-fA-F]{2,}/,
              /u[0-9a-fA-F]{4}/,
              /U[0-9a-fA-F]{8}/,
            ),
          ),
        ),
      ),

    string_simple: ($) =>
      seq(
        "'",
        repeat(
          choice(token.immediate(prec(1, /[^\\'\n]+/)), $.escape_sequence),
        ),
        "'",
      ),
    string_format: ($) => choice($.string_format_simple, $.string_format_multiline),

    string_format_simple: ($) =>
      seq(
       "f'",
       repeat(
          choice(token.immediate(prec(1, /[^\\'\n]+/)), $.escape_sequence),
        ),
        "'",
      ),

    string_format_multiline: ($) =>
      seq(
        "f'''",
        repeat(
          choice(
            token.immediate(prec(1, /[^\\']+/)),
            "''",
            "'",
            $.escape_sequence,
          ),
        ),
        "'''",
      ),

    string_multiline: ($) =>
      seq(
        "'''",
        repeat(
          choice(
            token.immediate(prec(1, /[^\\']+/)),
            "''",
            "'",
            $.escape_sequence,
          ),
        ),
        "'''",
      ),

    // boolean_literal: "true" | "false"
    boolean_literal: ($) => choice("true", "false"),

    // array_literal: "[" [expression_list] "]"
    array_literal: ($) =>
      seq(
        "[",
        seq(//optional(repeat($._NEWLINE)),
        optional(
          seq(
            $.expression,
            repeat(
              seq(
                //optional(repeat($._NEWLINE)),
                ",",
                //optional(repeat($._NEWLINE)),
                $.expression
              )
            ),
            optional(seq(optional(","), /*optional(repeat($._NEWLINE))*/)),
          ),
        )),
        "]"
      ),

    _NEWLINE: ($) => seq(optional($._comment), choice("\n", "\r\n")),

    // dictionary_literal: "{" [key_value_list] "}"
    dictionary_literal: ($) =>
      seq(
        "{",
        seq(optional(seq($.key_value_item, repeat(seq(",", $.key_value_item)))), optional(",")),
        "}",
      ),

    // key_value_item: expression ":" expression
    key_value_item: ($) =>
      seq(field("key", $.expression), ":", field("value", $.expression)),

    // identifier_list: id_expression ("," id_expression)*
    identifier_list: ($) =>
      seq($.id_expression, repeat(seq(",", $.id_expression))),

    primary_expression: ($) =>
      choice(seq("(", $.expression, ")"), $.id_expression),

    function_id: ($) => $._IDENTIFIER,
    keyword_arg_key: ($) => $._IDENTIFIER,

    // id_expression: IDENTIFIER
    id_expression: ($) => $._IDENTIFIER,

    // IDENTIFIER: /[a-zA-Z_][a-zA-Z_0-9]*/
    _IDENTIFIER: ($) => /[a-zA-Z_][a-zA-Z_0-9]*/,

    _comment: ($) => /#[^\n]*/,
  },
});
