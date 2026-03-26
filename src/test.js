[
  HumanMessage {
    "content": "查一下用户 002 的信息",
    "additional_kwargs": {},
    "response_metadata": {}
  },
  AIMessage {
    "id": "chatcmpl-e5bfd13a-b009-90b0-997f-890f427fb449",
    "content": "",
    "additional_kwargs": {
      "tool_calls": [
        {
          "index": 0,
          "id": "call_bf72b6b9bee74caaaca924",
          "type": "function",
          "function": "[Object]"
        }
      ]
    },
    "response_metadata": {
      "tokenUsage": {
        "promptTokens": 195,
        "completionTokens": 21,
        "totalTokens": 216
      },
      "finish_reason": "tool_calls",
      "model_provider": "openai",
      "model_name": "qwen-plus"
    },
    "tool_calls": [
      {
        "name": "query_user",
        "args": {
          "userId": "002"
        },
        "type": "tool_call",
        "id": "call_bf72b6b9bee74caaaca924"
      }
    ],
    "invalid_tool_calls": [],
    "usage_metadata": {
      "output_tokens": 21,
      "input_tokens": 195,
      "total_tokens": 216,
      "input_token_details": {
        "cache_read": 0
      },
      "output_token_details": {}
    }
  },
  ToolMessage {
    "content": "用户信息：\n- ID: 002\n- 姓名: 李四\n- 邮箱: lisi@example.com\n- 角色: user",
    "additional_kwargs": {},
    "response_metadata": {},
    "tool_call_id": "call_bf72b6b9bee74caaaca924"
  },
  AIMessage {
    "id": "chatcmpl-9c89425d-bd5d-998a-851e-4b8b74a79cc6",
    "content": "用户 002 的信息如下：\n\n- **ID**: 002  \n- **姓名**: 李四  \n- **邮箱**: lisi@example.com  \n- **角色**: user",
    "additional_kwargs": {},
    "response_metadata": {
      "tokenUsage": {
        "promptTokens": 268,
        "completionTokens": 40,
        "totalTokens": 308
      },
      "finish_reason": "stop",
      "model_provider": "openai",
      "model_name": "qwen-plus"
    },
    "tool_calls": [],
    "invalid_tool_calls": [],
    "usage_metadata": {
      "output_tokens": 40,
      "input_tokens": 268,
      "total_tokens": 308,
      "input_token_details": {
        "cache_read": 0
      },
      "output_token_details": {}
    }
  }
]