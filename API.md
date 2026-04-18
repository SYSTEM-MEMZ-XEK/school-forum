# 校园论坛 API 文档

本文档详细描述了校园论坛系统的所有 API 接口，供客户端开发者参考。

## 基础信息

- **Base URL**: `http://your-domain:3000`
- **Content-Type**: `application/json`
- **响应格式**: JSON

### 统一响应格式

```json
{
  "success": true,
  "message": "操作成功",
  "data": { ... }
}
```

错误响应：
```json
{
  "success": false,
  "message": "错误信息"
}
```

---

## 目录

- [基础接口](#基础接口)
- [用户模块](#用户模块)
- [帖子模块](#帖子模块)
- [关注模块](#关注模块)
- [收藏模块](#收藏模块)
- [通知模块](#通知模块)
- [举报模块](#举报模块)
- [统计模块](#统计模块)
- [配置模块](#配置模块)
- [私信模块](#私信模块)
- [黑名单模块](#黑名单模块)
- [公告模块](#公告模块)
- [运行模式模块](#运行模式模块)
- [管理后台](#管理后台)
- [安全说明](#安全说明)

---

## 基础接口

### 健康检查

```
GET /health
```

**响应示例**：
```json
{
  "success": true,
  "message": "服务器运行正常",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## 用户模块

### 发送注册验证码

```
POST /send-verification-code
```

**请求参数**：
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| email | string | 是 | 邮箱地址 |

**请求示例**：
```json
{
  "email": "user@example.com"
}
```

**响应示例**：
```json
{
  "success": true,
  "message": "验证码已发送到您的邮箱"
}
```

---

### 发送登录验证码

```
POST /send-login-verification-code
```

**请求参数**：
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| email | string | 是 | 邮箱地址 |

---

### 发送密码修改验证码

```
POST /send-password-change-code
```

**请求参数**：
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| userId | string | 是 | 用户ID |
| currentPassword | string | 是 | 当前密码 |

**响应示例**：
```json
{
  "success": true,
  "message": "验证码已发送到您的邮箱",
  "data": {
    "email": "u***@example.com"
  }
}
```

---

### 验证密码修改验证码

```
POST /verify-password-change-code
```

**请求参数**：
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| userId | string | 是 | 用户ID |
| verificationCode | string | 是 | 6位验证码 |

---

### 修改密码

```
POST /change-password
```

> 🔑 需要认证

**请求参数**：
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| userId | string | 是 | 用户ID |
| verificationCode | string | 是 | 已验证的验证码 |
| newPassword | string | 是 | 新密码 |

---

### 发送邮箱修改验证码

```
POST /send-email-change-code
```

> 🔑 需要认证

**请求参数**：
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| userId | string | 是 | 用户ID |
| newEmail | string | 是 | 新邮箱地址 |
| currentPassword | string | 是 | 当前密码 |

---

### 验证并完成邮箱修改

```
POST /verify-email-change
```

> 🔑 需要认证

**请求参数**：
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| userId | string | 是 | 用户ID |
| verificationCode | string | 是 | 6位验证码 |

---

### 修改 QQ 号

```
POST /change-qq
```

> 🔑 需要认证

**请求参数**：
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| userId | string | 是 | 用户ID |
| newQq | string | 是 | 新 QQ 号 |
| currentPassword | string | 是 | 当前密码 |

---

### 发送账户注销验证码

```
POST /send-deletion-code
```

> 🔑 需要认证

**请求参数**：
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| userId | string | 是 | 用户ID |

---

### 注销账户

```
POST /delete-account
```

> 🔑 需要认证

**请求参数**：
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| userId | string | 是 | 用户ID |
| verificationCode | string | 是 | 6位验证码 |

---

### 用户注册

```
POST /register
```

**请求参数**：
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| qq | string | 是 | QQ号 |
| username | string | 是 | 用户名（2-20字符） |
| password | string | 是 | 密码（至少6位） |
| email | string | 是 | 邮箱地址 |
| verificationCode | string | 是 | 6位验证码 |
| school | string | 是 | 学校ID |
| enrollmentYear | number | 是 | 入学年份 |
| className | string | 是 | 班级名称 |

**请求示例**：
```json
{
  "qq": "12345678",
  "username": "张三",
  "password": "password123",
  "email": "user@example.com",
  "verificationCode": "123456",
  "school": "TCZX",
  "enrollmentYear": 2024,
  "className": "高一(1)班"
}
```

**响应示例**：
```json
{
  "success": true,
  "message": "注册成功",
  "data": {
    "user": {
      "id": "uuid-string",
      "qq": "12345678",
      "username": "张三",
      "email": "user@example.com",
      "school": "TCZX",
      "enrollmentYear": 2024,
      "className": "高一(1)班",
      "grade": "高一",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "postCount": 0,
      "commentCount": 0,
      "isActive": true
    }
  }
}
```

---

### 用户登录

```
POST /login
```

**请求参数**：
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| email | string | 是 | 邮箱地址 |
| qq | string | 是 | QQ号 |
| password | string | 是 | 密码 |
| verificationCode | string | 是 | 6位验证码 |

**请求示例**：
```json
{
  "email": "user@example.com",
  "qq": "12345678",
  "password": "password123",
  "verificationCode": "123456"
}
```

**响应示例**：
```json
{
  "success": true,
  "message": "登录成功",
  "data": {
    "user": {
      "id": "uuid-string",
      "qq": "12345678",
      "username": "张三",
      "email": "user@example.com",
      "school": "TCZX",
      "grade": "高一",
      "className": "高一(1)班",
      "avatar": "/images/avatars/xxx.jpg",
      "lastLogin": "2024-01-01T00:00:00.000Z"
    },
    "isAdmin": false
  }
}
```

---

### 验证登录状态

```
POST /auth/verify
```

**请求参数**：
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| userId | string | 是 | 用户ID |

**响应示例**：
```json
{
  "success": true,
  "message": "用户验证通过",
  "data": {
    "user": { ... },
    "isAdmin": false,
    "isBanned": false,
    "valid": true
  }
}
```

---

### 获取用户资料

```
GET /users/:id
```

**路径参数**：
| 参数 | 类型 | 说明 |
|-----|------|------|
| id | string | 用户ID |

**响应示例**：
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid-string",
      "qq": "12345678",
      "username": "张三",
      "school": "TCZX",
      "grade": "高一",
      "className": "高一(1)班",
      "avatar": "/images/avatars/xxx.jpg",
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "stats": {
      "postCount": 10,
      "commentCount": 25,
      "totalLikes": 50,
      "totalViews": 200,
      "joinDate": "2024-01-01T00:00:00.000Z",
      "lastLogin": "2024-01-15T00:00:00.000Z"
    },
    "recentPosts": [ ... ]
  }
}
```

---

### 修改用户资料

```
PUT /users/:id
```

**路径参数**：
| 参数 | 类型 | 说明 |
|-----|------|------|
| id | string | 用户ID |

**请求参数**：
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| currentPassword | string | 否 | 当前密码（修改密码时必填） |
| newPassword | string | 否 | 新密码 |
| username | string | 否 | 新用户名 |
| settings | object | 否 | 用户设置 |

**请求示例**：
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123",
  "username": "新用户名"
}
```

---

### 更新用户设置

```
PUT /users/:id/settings
```

**请求参数**：
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| settings | object | 是 | 设置对象 |

**请求示例**：
```json
{
  "settings": {
    "theme": "dark",
    "notifications": true
  }
}
```

---

### 上传头像

```
POST /users/:id/avatar
```

**请求格式**: `multipart/form-data`

**参数**：
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| avatar | file | 是 | 头像图片（JPG/PNG/GIF/WebP，最大2MB） |

**响应示例**：
```json
{
  "success": true,
  "message": "头像上传成功",
  "data": {
    "user": { ... },
    "avatarUrl": "/images/avatars/xxx.jpg"
  }
}
```

---

### 删除头像

```
DELETE /users/:id/avatar
```

**请求参数**：无（通过路径参数指定用户）

---

## 帖子模块

### 获取帖子列表

```
GET /posts
```

**查询参数**：
| 参数 | 类型 | 必填 | 默认值 | 说明 |
|-----|------|-----|-------|------|
| page | number | 否 | 1 | 页码 |
| limit | number | 否 | 100 | 每页数量 |
| search | string | 否 | - | 搜索关键词 |
| sortBy | string | 否 | latest | 排序方式 |

**sortBy 可选值**：
| 值 | 说明 |
|---|------|
| latest | 最新发布（默认） |
| relevance | 综合热度 |
| likes | 点赞数排序 |
| favorites | 收藏数排序 |
| views | 浏览量排序 |
| comments | 评论数排序 |

**响应示例**：
```json
{
  "success": true,
  "data": {
    "posts": [
      {
        "id": "uuid-string",
        "userId": "user-uuid",
        "username": "张三",
        "userAvatar": "/images/avatars/xxx.jpg",
        "school": "TCZX",
        "grade": "高一",
        "className": "高一(1)班",
        "content": "帖子内容...",
        "images": [
          { "url": "/images/xxx.jpg", "filename": "xxx.jpg" }
        ],
        "anonymous": false,
        "timestamp": "2024-01-01T00:00:00.000Z",
        "likes": 10,
        "dislikes": 0,
        "viewCount": 100,
        "comments": [ ... ]
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 10,
      "totalPosts": 100,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

### 发布帖子

```
POST /posts
```

**请求格式**: `multipart/form-data`

**参数**：
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| userId | string | 是 | 用户ID |
| username | string | 是 | 用户名 |
| school | string | 是 | 学校ID |
| grade | string | 是 | 年级 |
| className | string | 是 | 班级 |
| content | string | 否* | 帖子内容（无图片时必填） |
| anonymous | string | 否 | 是否匿名（"true"） |
| images | file[] | 否* | 图片文件（最多20张） |

> *内容和图片至少提供一项

**响应示例**：
```json
{
  "success": true,
  "message": "帖子发布成功",
  "data": {
    "post": {
      "id": "uuid-string",
      "userId": "user-uuid",
      "username": "张三",
      "content": "帖子内容...",
      "images": [ ... ],
      "timestamp": "2024-01-01T00:00:00.000Z",
      "likes": 0,
      "likedBy": [],
      "comments": [],
      "viewCount": 0,
      "isDeleted": false
    }
  }
}
```

---

### 获取帖子详情

```
GET /posts/:id
```

**路径参数**：
| 参数 | 类型 | 说明 |
|-----|------|------|
| id | string | 帖子ID |

---

### 编辑帖子

```
PUT /posts/:id
```

**请求格式**: `multipart/form-data`

**参数**：
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| userId | string | 是 | 用户ID |
| content | string | 否 | 新内容 |
| deletedImages | string | 否 | JSON数组，要删除的图片URL |
| images | file[] | 否 | 新增图片 |

---

### 删除帖子

```
DELETE /posts/:id
```

**请求参数**：
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| userId | string | 是 | 用户ID（必须是帖子作者） |

---

### 增加浏览量

```
POST /posts/:id/view
```

**响应示例**：
```json
{
  "success": true,
  "data": {
    "viewCount": 101
  }
}
```

---

### 点赞帖子

```
POST /posts/:id/like
```

**请求参数**：
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| userId | string | 是 | 用户ID |

**响应示例**：
```json
{
  "success": true,
  "message": "点赞成功",
  "data": {
    "likes": 11,
    "liked": true,
    "dislikes": 0,
    "disliked": false
  }
}
```

---

### 点踩帖子

```
POST /posts/:id/dislike
```

**请求参数**：
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| userId | string | 是 | 用户ID |

**响应示例**：
```json
{
  "success": true,
  "message": "点踩成功",
  "data": {
    "dislikes": 1,
    "disliked": true,
    "likes": 10,
    "liked": false
  }
}
```

---

### 添加评论

```
POST /posts/:id/comments
```

**路径参数**：
| 参数 | 类型 | 说明 |
|-----|------|------|
| id | string | 帖子ID |

**请求参数**：
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| userId | string | 是 | 用户ID |
| username | string | 是 | 用户名 |
| content | string | 是 | 评论内容（最多500字） |
| anonymous | boolean | 否 | 是否匿名 |

**响应示例**：
```json
{
  "success": true,
  "message": "评论添加成功",
  "data": {
    "comment": {
      "id": "uuid-string",
      "userId": "user-uuid",
      "username": "张三",
      "content": "评论内容",
      "anonymous": false,
      "timestamp": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

---

### 回复评论

```
POST /posts/:id/comments/:commentId/replies
```

**路径参数**：
| 参数 | 类型 | 说明 |
|-----|------|------|
| id | string | 帖子ID |
| commentId | string | 评论ID |

**请求参数**：
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| userId | string | 是 | 用户ID |
| username | string | 是 | 用户名 |
| content | string | 是 | 回复内容 |
| anonymous | boolean | 否 | 是否匿名 |
| replyToId | string | 否 | 被回复的回复ID（嵌套回复） |

---

### 删除评论

```
DELETE /posts/:id/comments/:commentId
```

**请求参数**：
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| userId | string | 是 | 用户ID |
| replyId | string | 否 | 回复ID（删除回复时） |
| nestedReplyId | string | 否 | 嵌套回复ID |

---

## 关注模块

### 关注用户

```
POST /follow
```

**请求参数**：
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| followerId | string | 是 | 关注者ID |
| followingId | string | 是 | 被关注者ID |

**响应示例**：
```json
{
  "success": true,
  "message": "关注成功",
  "data": {
    "following": true
  }
}
```

---

### 取消关注

```
DELETE /follow
```

**请求参数**：
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| followerId | string | 是 | 关注者ID |
| followingId | string | 是 | 被关注者ID |

---

### 检查关注状态

```
GET /follow/status
```

**查询参数**：
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| followerId | string | 是 | 关注者ID |
| followingId | string | 是 | 被关注者ID |

**响应示例**：
```json
{
  "success": true,
  "data": {
    "isFollowing": true
  }
}
```

---

### 获取关注统计

```
GET /follow/stats/:userId
```

**响应示例**：
```json
{
  "success": true,
  "data": {
    "followingCount": 10,
    "followerCount": 25
  }
}
```

---

### 获取关注列表

```
GET /following/:userId
```

**查询参数**：
| 参数 | 类型 | 必填 | 默认值 | 说明 |
|-----|------|-----|-------|------|
| page | number | 否 | 1 | 页码 |
| limit | number | 否 | 20 | 每页数量 |
| currentUserId | string | 否 | - | 当前用户ID |

**响应示例**：
```json
{
  "success": true,
  "data": {
    "list": [
      {
        "id": "user-uuid",
        "username": "张三",
        "avatar": "/images/avatars/xxx.jpg",
        "school": "TCZX",
        "grade": "高一",
        "className": "高一(1)班",
        "followedAt": "2024-01-01T00:00:00.000Z",
        "isAdmin": false,
        "isFollowing": true
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "total": 100,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

### 获取粉丝列表

```
GET /followers/:userId
```

参数同关注列表。

---

### 获取关注用户的帖子

```
GET /following/posts/:userId
```

**查询参数**：
| 参数 | 类型 | 必填 | 默认值 | 说明 |
|-----|------|-----|-------|------|
| page | number | 否 | 1 | 页码 |
| limit | number | 否 | 10 | 每页数量 |

---

### 获取新帖子数量

```
GET /follow/new-posts/:userId
```

**响应示例**：
```json
{
  "success": true,
  "data": {
    "count": 5
  }
}
```

---

### 标记已查看关注动态

```
POST /follow/mark-viewed
```

**请求参数**：
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| userId | string | 是 | 用户ID |

---

## 收藏模块

### 收藏帖子

```
POST /favorites/:postId
```

**路径参数**：
| 参数 | 类型 | 说明 |
|-----|------|------|
| postId | string | 帖子ID |

**请求参数**：
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| userId | string | 是 | 用户ID |
| tagId | string | 否 | 标签ID |

**响应示例**：
```json
{
  "success": true,
  "message": "收藏成功",
  "data": {
    "favorited": true,
    "favorite": {
      "userId": "user-uuid",
      "postId": "post-uuid",
      "tagId": null,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

---

### 取消收藏

```
DELETE /favorites/:postId
```

**请求参数**：
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| userId | string | 是 | 用户ID |

---

### 检查是否已收藏

```
GET /favorites/:postId/check
```

**查询参数**：
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| userId | string | 是 | 用户ID |

**响应示例**：
```json
{
  "success": true,
  "data": {
    "favorited": true,
    "favoriteCount": 10,
    "tagId": "tag-uuid"
  }
}
```

---

### 获取用户收藏列表

```
GET /favorites/user/:userId
```

**查询参数**：
| 参数 | 类型 | 必填 | 默认值 | 说明 |
|-----|------|-----|-------|------|
| page | number | 否 | 1 | 页码 |
| limit | number | 否 | 10 | 每页数量 |
| tagId | string | 否 | - | 按标签筛选 |

**响应示例**：
```json
{
  "success": true,
  "data": {
    "posts": [
      {
        "id": "post-uuid",
        "content": "帖子内容...",
        "isDeleted": false,
        "userAvatar": "/images/avatars/xxx.jpg",
        "favoriteAt": "2024-01-01T00:00:00.000Z",
        "tagId": "tag-uuid"
      }
    ],
    "pagination": { ... }
  }
}
```

---

### 获取收藏数量

```
GET /favorites/user/:userId/count
```

---

### 更新收藏标签

```
PUT /favorites/:postId/tag
```

**请求参数**：
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| userId | string | 是 | 用户ID |
| tagId | string | 否 | 标签ID（null表示取消标签） |

---

### 批量删除收藏

```
POST /favorites/batch/delete
```

**请求参数**：
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| userId | string | 是 | 用户ID |
| postIds | string[] | 是 | 帖子ID数组 |

---

### 批量移动到标签

```
POST /favorites/batch/move
```

**请求参数**：
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| userId | string | 是 | 用户ID |
| postIds | string[] | 是 | 帖子ID数组 |
| tagId | string | 否 | 目标标签ID |

---

### 获取用户标签

```
GET /favorites/tags/:userId
```

**响应示例**：
```json
{
  "success": true,
  "data": {
    "tags": [
      {
        "_id": "tag-uuid",
        "userId": "user-uuid",
        "name": "学习资料",
        "color": "#4361ee",
        "order": 0,
        "favoriteCount": 5
      }
    ]
  }
}
```

---

### 创建标签

```
POST /favorites/tags
```

**请求参数**：
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| userId | string | 是 | 用户ID |
| name | string | 是 | 标签名称 |
| color | string | 否 | 标签颜色（默认 #4361ee） |

---

### 更新标签

```
PUT /favorites/tags/:tagId
```

**请求参数**：
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| userId | string | 是 | 用户ID |
| name | string | 否 | 标签名称 |
| color | string | 否 | 标签颜色 |

---

### 删除标签

```
DELETE /favorites/tags/:tagId
```

**请求参数**：
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| userId | string | 是 | 用户ID |

---

### 更新标签排序

```
PUT /favorites/tags/order
```

**请求参数**：
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| userId | string | 是 | 用户ID |
| tagOrders | array | 是 | 排序数据 `[{id, order}, ...]` |

---

## 通知模块

### 获取通知列表

```
GET /notifications
```

**查询参数**：
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| userId | string | 是 | 用户ID |

**响应示例**：
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "notification-uuid",
        "userId": "user-uuid",
        "type": "like",
        "postId": "post-uuid",
        "postTitle": "帖子标题...",
        "fromUserId": "from-user-uuid",
        "fromUsername": "张三",
        "timestamp": "2024-01-01T00:00:00.000Z",
        "read": false,
        "postExists": true
      }
    ]
  }
}
```

**通知类型**：
| type | 说明 |
|------|------|
| like | 点赞通知 |
| comment | 评论通知 |
| comment_reply | 回复通知 |
| follow | 关注通知 |
| system | 系统通知 |

---

### 标记通知已读

```
POST /notifications/:id/read
```

**路径参数**：
| 参数 | 类型 | 说明 |
|-----|------|------|
| id | string | 通知ID |

**请求参数**：
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| userId | string | 是 | 用户ID |

---

### 标记全部已读

```
POST /notifications/read-all
```

**请求参数**：
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| userId | string | 是 | 用户ID |

---

## 举报模块

### 获取举报类型

```
GET /reports/types
```

**响应示例**：
```json
{
  "success": true,
  "data": {
    "types": {
      "SPAM": "垃圾广告",
      "HARASSMENT": "骚扰辱骂",
      "INAPPROPRIATE": "不当内容",
      "FALSE_INFO": "虚假信息",
      "COPYRIGHT": "侵权内容",
      "OTHER": "其他"
    }
  }
}
```

---

### 提交举报

```
POST /reports
```

**请求参数**：
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| reporterId | string | 是 | 举报人ID |
| targetType | string | 是 | 目标类型：post/comment |
| targetId | string | 是 | 目标ID |
| reason | string | 是 | 举报原因（见类型列表） |
| description | string | 否 | 详细描述 |

**请求示例**：
```json
{
  "reporterId": "user-uuid",
  "targetType": "post",
  "targetId": "post-uuid",
  "reason": "SPAM",
  "description": "这是垃圾广告"
}
```

---

### 获取用户举报历史

```
GET /reports/user/:userId
```

---

## 统计模块

### 获取统计数据

```
GET /stats
```

**响应示例**：
```json
{
  "success": true,
  "data": {
    "stats": {
      "totalUsers": 1000,
      "totalPosts": 5000,
      "todayPosts": 50,
      "totalComments": 10000,
      "totalLikes": 25000,
      "activeUsers": 500,
      "anonymousPosts": 200
    }
  }
}
```

---

### 搜索

```
GET /search
```

**查询参数**：
| 参数 | 类型 | 必填 | 默认值 | 说明 |
|-----|------|-----|-------|------|
| q | string | 是 | - | 搜索关键词 |
| type | string | 否 | posts | 搜索类型：posts/users |
| page | number | 否 | 1 | 页码 |
| limit | number | 否 | 100 | 每页数量 |

---

## 配置模块

### 获取学校列表

```
GET /schools
```

**响应示例**：
```json
{
  "success": true,
  "data": {
    "schools": [
      {
        "id": "TCZX",
        "name": "天长中学",
        "classInfo": [
          { "year": 2024, "classCount": 25 }
        ]
      }
    ]
  }
}
```

---

### 获取公开配置

```
GET /public
```

**响应示例**：
```json
{
  "success": true,
  "data": {
    "config": {
      "contentLimits": {
        "post": 10000,
        "comment": 500,
        "username": { "min": 2, "max": 20 }
      },
      "upload": {
        "maxFiles": 32,
        "maxFileSize": 33554432,
        "allowedTypes": ["image/jpeg", "image/png", ...]
      }
    }
  }
}
```

---

## 私信模块

### 发送私信

```
POST /messages
```

**请求参数**：
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| senderId | string | 是 | 发送者ID |
| receiverId | string | 是 | 接收者ID |
| content | string | 是 | 消息内容（最多2000字） |

**请求示例**：
```json
{
  "senderId": "user-uuid-1",
  "receiverId": "user-uuid-2",
  "content": "你好！"
}
```

**响应示例**：
```json
{
  "success": true,
  "message": "消息发送成功",
  "data": {
    "message": {
      "id": "message-uuid",
      "conversationId": "conversation-uuid",
      "senderId": "user-uuid-1",
      "receiverId": "user-uuid-2",
      "content": "你好！",
      "type": "text",
      "read": false,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "senderUsername": "张三",
      "senderAvatar": "/images/avatars/xxx.jpg"
    }
  }
}
```

> **发送规则**：
> - 互相关注的用户可以无限次互发消息
> - 非互关用户：A发消息给B后，必须等B回复才能继续发送
> - 被对方拉黑或自己拉黑对方时无法发送

---

### 获取消息记录

```
GET /messages
```

**查询参数**：
| 参数 | 类型 | 必填 | 默认值 | 说明 |
|-----|------|-----|-------|------|
| userId | string | 是 | - | 当前用户ID |
| otherUserId | string | 是 | - | 对方用户ID |
| limit | number | 否 | 50 | 每页数量 |
| before | string | 否 | - | 获取此时间之前的消息 |

**响应示例**：
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "message-uuid",
        "conversationId": "conversation-uuid",
        "senderId": "user-uuid-1",
        "receiverId": "user-uuid-2",
        "content": "你好！",
        "type": "text",
        "read": true,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "senderUsername": "张三",
        "senderAvatar": "/images/avatars/xxx.jpg"
      }
    ]
  }
}
```

---

### 获取未读消息总数

```
GET /messages/unread
```

**查询参数**：
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| userId | string | 是 | 用户ID |

**响应示例**：
```json
{
  "success": true,
  "data": {
    "unreadCount": 5
  }
}
```

---

### 检查发送权限

```
GET /messages/check-permission
```

**查询参数**：
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| senderId | string | 是 | 发送者ID |
| receiverId | string | 是 | 接收者ID |

**响应示例**：
```json
{
  "success": true,
  "data": {
    "canSend": true,
    "reason": "互相关注用户",
    "relation": {
      "isFollowing": true,
      "isFollower": true,
      "isMutualFollow": true
    },
    "blockStatus": {
      "isBlocked": false,
      "isBlockedBy": false
    }
  }
}
```

---

### 获取可联系用户列表

```
GET /messages/contactable-users
```

**查询参数**：
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| userId | string | 是 | 用户ID |

**响应示例**：
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "user-uuid",
        "username": "张三",
        "avatar": "/images/avatars/xxx.jpg",
        "school": "TCZX",
        "isFollowing": true,
        "isFollower": true
      }
    ]
  }
}
```

---

### 删除单条消息

```
DELETE /messages/:messageId
```

**路径参数**：
| 参数 | 类型 | 说明 |
|-----|------|------|
| messageId | string | 消息ID |

**请求参数**：
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| userId | string | 是 | 用户ID |

---

### 获取会话列表

```
GET /conversations
```

**查询参数**：
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| userId | string | 是 | 用户ID |

**响应示例**：
```json
{
  "success": true,
  "data": {
    "conversations": [
      {
        "id": "conversation-uuid",
        "otherUser": {
          "id": "user-uuid",
          "username": "张三",
          "avatar": "/images/avatars/xxx.jpg",
          "school": "TCZX"
        },
        "lastMessage": {
          "content": "好的",
          "senderId": "user-uuid",
          "createdAt": "2024-01-01T00:00:00.000Z"
        },
        "updatedAt": "2024-01-01T00:00:00.000Z",
        "unreadCount": 2
      }
    ]
  }
}
```

---

### 删除会话

```
DELETE /conversations/:conversationId
```

**路径参数**：
| 参数 | 类型 | 说明 |
|-----|------|------|
| conversationId | string | 会话ID |

**请求参数**：
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| userId | string | 是 | 用户ID |

---

## 黑名单模块

### 拉黑用户

```
POST /block
```

**请求参数**：
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| blockerId | string | 是 | 拉黑者ID |
| blockedId | string | 是 | 被拉黑者ID |

**响应示例**：
```json
{
  "success": true,
  "message": "拉黑成功",
  "data": {
    "blocked": true
  }
}
```

> **注意**：拉黑用户时会自动取消双方的关注关系

---

### 取消拉黑

```
POST /unblock
```

**请求参数**：
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| blockerId | string | 是 | 拉黑者ID |
| blockedId | string | 是 | 被拉黑者ID |

**响应示例**：
```json
{
  "success": true,
  "message": "取消拉黑成功",
  "data": {
    "blocked": false
  }
}
```

---

### 检查拉黑状态

```
GET /block/status
```

**查询参数**：
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| blockerId | string | 是 | 用户ID |
| blockedId | string | 是 | 目标用户ID |

**响应示例**：
```json
{
  "success": true,
  "data": {
    "isBlocked": true,
    "isBlockedBy": false
  }
}
```

---

### 检查拉黑关系

```
GET /block/relation
```

**查询参数**：
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| userId1 | string | 是 | 用户1 ID |
| userId2 | string | 是 | 用户2 ID |

**响应示例**：
```json
{
  "success": true,
  "data": {
    "hasBlockRelation": true
  }
}
```

---

### 获取拉黑列表

```
GET /blocked/:userId
```

**路径参数**：
| 参数 | 类型 | 说明 |
|-----|------|------|
| userId | string | 用户ID |

**查询参数**：
| 参数 | 类型 | 必填 | 默认值 | 说明 |
|-----|------|-----|-------|------|
| page | number | 否 | 1 | 页码 |
| limit | number | 否 | 20 | 每页数量 |

**响应示例**：
```json
{
  "success": true,
  "data": {
    "list": [
      {
        "id": "user-uuid",
        "username": "张三",
        "avatar": "/images/avatars/xxx.jpg",
        "school": "TCZX",
        "grade": "高一",
        "className": "高一(1)班",
        "blockedAt": "2024-01-01T00:00:00.000Z",
        "isAdmin": false
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "total": 100,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

### 获取拉黑数量

```
GET /blocked/count/:userId
```

**路径参数**：
| 参数 | 类型 | 说明 |
|-----|------|------|
| userId | string | 用户ID |

**响应示例**：
```json
{
  "success": true,
  "data": {
    "count": 10
  }
}
```

---

## 公告模块

### 获取有效公告列表

```
GET /announcements/active
```

**响应示例**：
```json
{
  "success": true,
  "data": {
    "announcements": [
      {
        "id": "announcement-uuid",
        "title": "系统公告",
        "content": "公告内容...",
        "type": "info",
        "pinned": true,
        "active": true,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

---

### 获取公告详情

```
GET /announcements/:id
```

**路径参数**：
| 参数 | 类型 | 说明 |
|-----|------|------|
| id | string | 公告ID |

---

## 运行模式模块

### 获取当前运行模式

```
GET /run-mode
```

**响应示例**：
```json
{
  "success": true,
  "data": {
    "mode": "normal",
    "message": null
  }
}
```

**mode 可选值**：
| 值 | 说明 |
|---|------|
| `normal` | 正常运行 |
| `maintenance` | 维护模式（普通用户无法访问） |
| `readonly` | 只读模式（无法发帖/评论） |

---

### 获取维护模式消息

```
GET /maintenance-message
```

**响应示例**：
```json
{
  "success": true,
  "data": {
    "message": "系统维护中，预计恢复时间：2024-01-01 12:00"
  }
}
```

---

## 管理后台

> 以下接口需要管理员权限，通过中间件验证。

### 获取帖子列表（含已删除）

```
GET /admin/posts
```

**查询参数**：
| 参数 | 类型 | 必填 | 默认值 | 说明 |
|-----|------|-----|-------|------|
| page | number | 否 | 1 | 页码 |
| limit | number | 否 | 100 | 每页数量 |
| search | string | 否 | - | 搜索关键词 |

---

### 永久删除帖子

```
DELETE /admin/posts/:id
```

**请求参数**：
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| adminId | string | 是 | 管理员ID |
| reason | string | 否 | 删除原因 |

---

### 获取所有用户

```
GET /admin/users
```

---

### 获取封禁用户列表

```
GET /admin/banned-users
```

---

### 封禁用户

```
POST /admin/users/:id/ban
```

**路径参数**：
| 参数 | 类型 | 说明 |
|-----|------|------|
| id | string | 用户ID |

**请求参数**：
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| adminId | string | 是 | 管理员ID |
| duration | number | 否 | 封禁天数（默认7，365为永久） |
| reason | string | 否 | 封禁原因 |

---

### 解封用户

```
POST /admin/users/:id/unban
```

**请求参数**：
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| adminId | string | 是 | 管理员ID |

---

### 获取详细统计

```
GET /admin/stats
```

**响应示例**：
```json
{
  "success": true,
  "data": {
    "stats": {
      "totalUsers": 1000,
      "totalPosts": 5000,
      "bannedUsers": 10,
      "activeUsers": 800,
      "todayPosts": 50,
      "weekPosts": 300,
      "monthPosts": 1000,
      "totalComments": 10000,
      "totalLikes": 25000,
      "anonymousPosts": 200,
      "gradeDistribution": { "高一": 300, "高二": 350 },
      "schoolDistribution": { "TCZX": 500, "BHZX": 300 },
      "topActiveUsers": [ ... ]
    }
  }
}
```

---

### 获取最近活动

```
GET /admin/recent-activity
```

---

### 获取所有评论

```
GET /admin/comments
```

**查询参数**：
| 参数 | 类型 | 必填 | 默认值 | 说明 |
|-----|------|-----|-------|------|
| page | number | 否 | 1 | 页码 |
| limit | number | 否 | 100 | 每页数量 |
| search | string | 否 | - | 搜索关键词 |

---

### 删除评论

```
DELETE /admin/comments/:id
```

**请求参数**：
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| adminId | string | 是 | 管理员ID |
| postId | string | 是 | 帖子ID |
| reason | string | 否 | 删除原因 |

---

### 获取日志

```
GET /admin/logs
```

**查询参数**：
| 参数 | 类型 | 必填 | 默认值 | 说明 |
|-----|------|-----|-------|------|
| page | number | 否 | 1 | 页码 |
| limit | number | 否 | 50 | 每页数量 |
| level | string | 否 | ALL | 日志级别 |
| search | string | 否 | - | 搜索关键词 |
| date | string | 否 | - | 日期（YYYY-MM-DD） |

---

### 获取日志日期列表

```
GET /admin/logs/dates
```

---

### 清空日志

```
DELETE /admin/logs
```

**请求参数**：
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| adminId | string | 是 | 管理员ID |
| date | string | 否 | 日期（不填则清空全部） |

---

### 删除指定日期日志

```
DELETE /admin/logs/date
```

**请求参数**：
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| adminId | string | 是 | 管理员ID |
| date | string | 是 | 日期（YYYY-MM-DD） |

---

### 获取举报列表

```
GET /admin/reports
```

**查询参数**：
| 参数 | 类型 | 必填 | 默认值 | 说明 |
|-----|------|-----|-------|------|
| page | number | 否 | 1 | 页码 |
| limit | number | 否 | 100 | 每页数量 |
| status | string | 否 | - | 状态：pending/processed/rejected |

---

### 获取举报统计

```
GET /admin/reports/stats
```

---

### 处理举报

```
POST /admin/reports/:reportId/process
```

**请求参数**：
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| adminId | string | 是 | 管理员ID |
| action | string | 是 | 操作：approve/reject |
| banDuration | number | 否 | 封禁天数 |
| note | string | 否 | 备注 |

---

### 获取配置

```
GET /admin/config
```

---

### 更新配置

```
PUT /admin/config
```

**请求参数**：
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| adminId | string | 是 | 管理员ID |
| updates | object | 是 | 配置更新对象 |

---

### 获取管理员列表

```
GET /admin/admins
```

---

### 添加管理员

```
POST /admin/admins
```

**请求参数**：
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| adminId | string | 是 | 当前管理员ID |
| newAdminId | string | 是 | 新管理员QQ号或用户ID |

---

### 删除管理员

```
DELETE /admin/admins
```

**请求参数**：
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| adminId | string | 是 | 当前管理员ID |
| targetAdminId | string | 是 | 目标管理员ID |

---

### 获取所有公告（管理员）

```
GET /admin/announcements
```

---

### 创建公告

```
POST /admin/announcements
```

**请求参数**：
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| title | string | 是 | 公告标题 |
| content | string | 是 | 公告内容（支持 Markdown） |
| type | string | 否 | 类型：`info`/`warning`/`error`（默认 `info`） |
| pinned | boolean | 否 | 是否置顶 |
| active | boolean | 否 | 是否启用（默认 `true`） |

---

### 更新公告

```
PUT /admin/announcements/:id
```

参数同创建公告（均为选填）。

---

### 删除公告

```
DELETE /admin/announcements/:id
```

---

### 切换公告启用状态

```
PATCH /admin/announcements/:id/toggle-status
```

---

### 切换公告置顶状态

```
PATCH /admin/announcements/:id/toggle-pinned
```

---

### 批量更新公告状态

```
PATCH /admin/announcements/batch-status
```

**请求参数**：
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| ids | string[] | 是 | 公告ID数组 |
| active | boolean | 是 | 目标状态 |

---

### 获取 IP 访问统计列表（管理员）

```
GET /admin/ip-stats
```

**查询参数**：
| 参数 | 类型 | 必填 | 默认值 | 说明 |
|-----|------|-----|-------|------|
| page | number | 否 | 1 | 页码 |
| limit | number | 否 | 100 | 每页数量 |

---

### 获取 IP 统计摘要（管理员）

```
GET /admin/ip-stats/summary
```

---

### 清除指定 IP 统计

```
DELETE /admin/ip-stats/:ip
```

---

### 清除所有 IP 统计

```
DELETE /admin/ip-stats
```

---

### 设置运行模式

```
POST /admin/run-mode
```

**请求参数**：
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| mode | string | 是 | `normal` / `maintenance` / `readonly` |
| message | string | 否 | 维护时显示的消息 |

---

### 自毁模式 - 三级

```
POST /admin/self-destruct/level3
```

> ⚠️ **危险操作**：删除所有帖子、评论、私信数据

---

### 自毁模式 - 二级

```
POST /admin/self-destruct/level2
```

> ⚠️ **危险操作**：清空整个数据库

---

### 自毁模式 - 一级

```
POST /admin/self-destruct/level1
```

> ⚠️ **极危险操作**：删除论坛所有文件

---

## 错误码说明

| HTTP状态码 | 说明 |
|-----------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未授权（密码错误等） |
| 403 | 禁止访问（无权限） |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

---

## 数据模型

### 用户 (User)

```javascript
/**
 * @typedef {Object} User
 * @property {string} id - UUID
 * @property {string} qq - QQ号
 * @property {string} username - 用户名
 * @property {string} email - 邮箱
 * @property {string} password - 加密密码（不返回）
 * @property {string} school - 学校ID
 * @property {number} enrollmentYear - 入学年份
 * @property {string} className - 班级
 * @property {string} grade - 年级
 * @property {string} [avatar] - 头像URL
 * @property {string} createdAt - 注册时间
 * @property {string} [lastLogin] - 最后登录
 * @property {number} postCount - 发帖数
 * @property {number} commentCount - 评论数
 * @property {boolean} isActive - 是否激活
 * @property {Object} [settings] - 用户设置
 */
```

### 帖子 (Post)

```javascript
/**
 * @typedef {Object} Post
 * @property {string} id - UUID
 * @property {string} userId - 作者ID
 * @property {string} username - 作者名
 * @property {string} school - 学校
 * @property {string} grade - 年级
 * @property {string} className - 班级
 * @property {string} content - 内容
 * @property {Image[]} images - 图片
 * @property {boolean} anonymous - 是否匿名
 * @property {string} timestamp - 发布时间
 * @property {string} [updatedAt] - 更新时间
 * @property {number} likes - 点赞数
 * @property {string[]} likedBy - 点赞用户ID
 * @property {number} dislikes - 点踩数
 * @property {string[]} dislikedBy - 点踩用户ID
 * @property {number} viewCount - 浏览量
 * @property {Comment[]} comments - 评论
 * @property {boolean} isDeleted - 是否删除
 */
```

### 图片 (Image)

```javascript
/**
 * @typedef {Object} Image
 * @property {string} url - 图片URL
 * @property {string} filename - 文件名
 */
```

### 评论 (Comment)

```javascript
/**
 * @typedef {Object} Comment
 * @property {string} id - UUID
 * @property {string} userId - 作者ID
 * @property {string} username - 作者名
 * @property {string} content - 内容
 * @property {boolean} anonymous - 是否匿名
 * @property {string} timestamp - 时间
 * @property {Reply[]} [replies] - 回复
 */

/**
 * @typedef {Object} Reply
 * @property {string} id - UUID
 * @property {string} userId - 作者ID
 * @property {string} username - 作者名
 * @property {string} content - 内容
 * @property {boolean} anonymous - 是否匿名
 * @property {string} replyTo - 回复目标ID
 * @property {string} timestamp - 时间
 * @property {Reply[]} [replies] - 嵌套回复
 */
```

### 通知 (Notification)

```javascript
/**
 * @typedef {Object} Notification
 * @property {string} id - UUID
 * @property {string} userId - 接收者ID
 * @property {'like'|'comment'|'comment_reply'|'follow'|'system'} type - 通知类型
 * @property {string} [postId] - 帖子ID
 * @property {string} [commentId] - 评论ID
 * @property {string} [fromUserId] - 发送者ID
 * @property {string} [fromUsername] - 发送者用户名
 * @property {string} [content] - 内容
 * @property {string} timestamp - 时间
 * @property {boolean} read - 是否已读
 */
```

### 收藏 (Favorite)

```javascript
/**
 * @typedef {Object} Favorite
 * @property {string} id - UUID
 * @property {string} userId - 用户ID
 * @property {string} postId - 帖子ID
 * @property {string} [tagId] - 标签ID
 * @property {string} createdAt - 收藏时间
 */
```

### 收藏标签 (FavoriteTag)

```javascript
/**
 * @typedef {Object} FavoriteTag
 * @property {string} _id - MongoDB ID
 * @property {string} userId - 用户ID
 * @property {string} name - 标签名称
 * @property {string} color - 标签颜色
 * @property {number} order - 排序
 */
```

### 关注 (Follow)

```javascript
/**
 * @typedef {Object} Follow
 * @property {string} id - UUID
 * @property {string} followerId - 关注者ID
 * @property {string} followingId - 被关注者ID
 * @property {string} createdAt - 关注时间
 */
```

### 会话 (Conversation)

```javascript
/**
 * @typedef {Object} Conversation
 * @property {string} id - 会话ID
 * @property {string[]} participants - 参与者ID数组
 * @property {Object} lastMessage - 最后一条消息
 * @property {string} lastMessage.content - 消息内容
 * @property {string} lastMessage.senderId - 发送者ID
 * @property {string} lastMessage.createdAt - 发送时间
 * @property {string} [canInitiateFrom] - 可发起消息的用户ID（非互关时）
 * @property {string} createdAt - 创建时间
 * @property {string} updatedAt - 更新时间
 * @property {boolean} lastMessageRead - 最后消息是否已读
 */
```

### 私信 (Message)

```javascript
/**
 * @typedef {Object} Message
 * @property {string} id - UUID
 * @property {string} conversationId - 会话ID
 * @property {string} senderId - 发送者ID
 * @property {string} receiverId - 接收者ID
 * @property {string} content - 消息内容
 * @property {string} type - 消息类型：text
 * @property {boolean} read - 是否已读
 * @property {string[]} deletedBy - 删除此消息的用户ID列表
 * @property {string} createdAt - 创建时间
 */
```

### 黑名单 (Blacklist)

```javascript
/**
 * @typedef {Object} Blacklist
 * @property {string} id - UUID
 * @property {string} blockerId - 拉黑者ID
 * @property {string} blockedId - 被拉黑者ID
 * @property {string} createdAt - 拉黑时间
 */
```

### 举报 (Report)

```javascript
/**
 * @typedef {Object} Report
 * @property {string} id - UUID
 * @property {string} reporterId - 举报人ID
 * @property {'post'|'comment'} targetType - 目标类型
 * @property {string} targetId - 目标ID
 * @property {string} targetUserId - 被举报用户ID
 * @property {string} reason - 举报原因
 * @property {string} reasonText - 举报原因文本
 * @property {string} [description] - 详细描述
 * @property {'pending'|'processed'|'rejected'} status - 状态
 * @property {string} createdAt - 创建时间
 */
```

### 公告 (Announcement)

```javascript
/**
 * @typedef {Object} Announcement
 * @property {string} id - UUID
 * @property {string} title - 公告标题
 * @property {string} content - 公告内容（支持 Markdown）
 * @property {'info'|'warning'|'error'} type - 公告类型
 * @property {boolean} pinned - 是否置顶
 * @property {boolean} active - 是否启用
 * @property {string} createdAt - 创建时间
 * @property {string} updatedAt - 更新时间
 */
```

---

## 安全说明

### 安全措施概览

本系统已实施多层安全防护措施，包括但不限于：

| 安全措施 | 说明 |
|---------|------|
| Helmet 安全头 | 设置 Content-Security-Policy、X-Frame-Options、HSTS 等安全头 |
| CORS 白名单 | 仅允许配置的域名进行跨域请求 |
| XSS 过滤 | 自动过滤请求体中的 XSS 攻击代码 |
| SQL/NoSQL 注入防护 | 检测并阻止潜在的注入攻击，使用 mongo-sanitize |
| HPP 防护 | 防止 HTTP 参数污染攻击 |
| Rate Limiting | 基于 Redis 的滑动窗口限流机制 |
| JWT 认证 | 基于 Token 的身份认证，支持令牌刷新和注销 |
| 登录锁定 | 多次登录失败后锁定账户 |
| 请求 ID 追踪 | 每个请求分配唯一 ID，便于安全审计 |

### JWT 认证

#### 认证流程

1. 用户登录成功后，服务器返回 `token`（访问令牌）和 `refreshToken`（刷新令牌）
2. 客户端在后续请求中通过 `Authorization: Bearer <token>` 头携带令牌
3. 访问令牌默认有效期 7 天，刷新令牌有效期 30 天
4. 访问令牌过期后，使用刷新令牌获取新的访问令牌

#### 刷新令牌

```
POST /refresh-token
```

**请求参数**：
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| refreshToken | string | 是 | 刷新令牌 |

**响应示例**：
```json
{
  "success": true,
  "data": {
    "token": "新的访问令牌"
  }
}
```

#### 登出

```
POST /logout
```

**请求参数**：
| 参数 | 类型 | 必填 | 说明 |
|-----|------|-----|------|
| token | string | 是 | 当前访问令牌 |

### 管理员认证

管理员在登录时会额外获得 `adminToken`，用于管理员操作的认证。

管理员认证支持两种方式：
1. **JWT Token**（推荐）：通过 `Authorization: Bearer <adminToken>` 头携带
2. **传统方式**（过渡期兼容）：通过请求体或查询参数传递 `adminId`

### 登录安全

- 连续 5 次登录失败后，账户将被锁定 30 分钟
- 锁定期间任何登录尝试都会被拒绝
- 成功登录后，失败计数自动清零

### 安全配置

安全配置通过环境变量管理，请参考 `.env.example` 文件：

| 环境变量 | 说明 | 默认值 |
|---------|------|--------|
| JWT_SECRET | JWT 密钥 | - |
| JWT_EXPIRES_IN | 访问令牌有效期 | 7d |
| CORS_ORIGIN | 允许的跨域来源（逗号分隔） | localhost:2080 |
| LOGIN_MAX_ATTEMPTS | 最大登录尝试次数 | 5 |
| LOGIN_LOCK_TIME | 锁定时间（毫秒） | 1800000 |
| MAX_REQUEST_SIZE | 请求体最大大小（MB） | 10 |

### 响应头说明

每个 API 响应都会包含以下安全相关头：

| 响应头 | 说明 |
|--------|------|
| X-Request-ID | 请求唯一标识，用于追踪和审计 |
| X-Content-Type-Options | 设置为 nosniff，防止 MIME 类型嗅探 |
| X-Frame-Options | 设置为 DENY，防止点击劫持 |
| Strict-Transport-Security | HSTS 配置，强制使用 HTTPS |
| Content-Security-Policy | 内容安全策略 |

### 最佳实践

1. **生产环境必须**：
   - 设置强随机的 `JWT_SECRET` 和 `ADMIN_JWT_SECRET`
   - 配置正确的 `CORS_ORIGIN` 白名单
   - 启用 HTTPS 并配置 HSTS

2. **客户端建议**：
   - 安全存储令牌（避免 localStorage，推荐 httpOnly Cookie）
   - 实现令牌自动刷新机制
   - 处理 401 响应时清除本地令牌并跳转登录

3. **敏感操作**：
   - 修改密码、邮箱等敏感操作需要验证码二次验证
   - 管理员操作需要独立的管理员令牌认证
