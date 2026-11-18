export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          address: string
          created_at: string
          id: string
          is_default: boolean
          label: string | null
          phone: string
          recipient_name: string
          township_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address: string
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string | null
          phone: string
          recipient_name: string
          township_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string | null
          phone?: string
          recipient_name?: string
          township_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "addresses_township_id_fkey"
            columns: ["township_id"]
            isOneToOne: false
            referencedRelation: "townships"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name_en: string
          name_my: string
          parent_id: string | null
          slug: string
          sort: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name_en: string
          name_my: string
          parent_id?: string | null
          slug: string
          sort?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name_en?: string
          name_my?: string
          parent_id?: string | null
          slug?: string
          sort?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          customer_id: string
          customer_last_read: string
          customer_name: string | null
          id: string
          last_message: string | null
          last_message_at: string
          product_id: string | null
          shop_id: string
          shop_last_read: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          customer_last_read?: string
          customer_name?: string | null
          id?: string
          last_message?: string | null
          last_message_at?: string
          product_id?: string | null
          shop_id: string
          shop_last_read?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          customer_last_read?: string
          customer_name?: string | null
          id?: string
          last_message?: string | null
          last_message_at?: string
          product_id?: string | null
          shop_id?: string
          shop_last_read?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          product_id: string | null
          sender_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          product_id?: string | null
          sender_id?: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          product_id?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          line_total: number
          name: string
          order_id: string
          product_id: string | null
          quantity: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          line_total: number
          name: string
          order_id: string
          product_id?: string | null
          quantity: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          line_total?: number
          name?: string
          order_id?: string
          product_id?: string | null
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          order_id?: string
          status?: Database["public"]["Enums"]["order_status"]
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address: string | null
          created_at: string
          customer_id: string
          delivery_fee: number
          delivery_method: Database["public"]["Enums"]["delivery_method"]
          id: string
          idempotency_key: string
          note: string | null
          order_no: number
          phone: string
          recipient_name: string
          shop_id: string
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
          township_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          customer_id: string
          delivery_fee?: number
          delivery_method: Database["public"]["Enums"]["delivery_method"]
          id?: string
          idempotency_key: string
          note?: string | null
          order_no?: number
          phone: string
          recipient_name: string
          shop_id: string
          status?: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
          township_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          customer_id?: string
          delivery_fee?: number
          delivery_method?: Database["public"]["Enums"]["delivery_method"]
          id?: string
          idempotency_key?: string
          note?: string | null
          order_no?: number
          phone?: string
          recipient_name?: string
          shop_id?: string
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          township_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_township_id_fkey"
            columns: ["township_id"]
            isOneToOne: false
            referencedRelation: "townships"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_counters: {
        Row: {
          last_no: number
          shop_id: string
        }
        Insert: {
          last_no?: number
          shop_id: string
        }
        Update: {
          last_no?: number
          shop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pos_counters_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: true
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_sale_items: {
        Row: {
          barcode: string | null
          id: string
          line_total: number
          name: string
          product_id: string | null
          quantity: number
          sale_id: string
          sku: string | null
          unit_price: number
        }
        Insert: {
          barcode?: string | null
          id?: string
          line_total: number
          name: string
          product_id?: string | null
          quantity: number
          sale_id: string
          sku?: string | null
          unit_price: number
        }
        Update: {
          barcode?: string | null
          id?: string
          line_total?: number
          name?: string
          product_id?: string | null
          quantity?: number
          sale_id?: string
          sku?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "pos_sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "pos_sales"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_sales: {
        Row: {
          cash_received: number | null
          change_due: number | null
          created_at: string
          created_by: string
          id: string
          idempotency_key: string
          payment_method: string
          request_hash: string
          sale_number: number
          shop_id: string
          status: string
          subtotal: number
          total: number
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          cash_received?: number | null
          change_due?: number | null
          created_at?: string
          created_by: string
          id?: string
          idempotency_key: string
          payment_method: string
          request_hash: string
          sale_number: number
          shop_id: string
          status?: string
          subtotal: number
          total: number
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          cash_received?: number | null
          change_due?: number | null
          created_at?: string
          created_by?: string
          id?: string
          idempotency_key?: string
          payment_method?: string
          request_hash?: string
          sale_number?: number
          shop_id?: string
          status?: string
          subtotal?: number
          total?: number
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pos_sales_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      product_imports: {
        Row: {
          added: number
          created_at: string
          failed: number
          file_name: string | null
          id: string
          shop_id: string
          updated: number
          user_id: string
        }
        Insert: {
          added?: number
          created_at?: string
          failed?: number
          file_name?: string | null
          id?: string
          shop_id: string
          updated?: number
          user_id?: string
        }
        Update: {
          added?: number
          created_at?: string
          failed?: number
          file_name?: string | null
          id?: string
          shop_id?: string
          updated?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_imports_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      product_templates: {
        Row: {
          created_at: string
          group_en: string
          group_my: string
          id: string
          is_active: boolean
          name_en: string
          name_my: string
          sort: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          group_en: string
          group_my: string
          id?: string
          is_active?: boolean
          name_en: string
          name_my: string
          sort?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          group_en?: string
          group_my?: string
          id?: string
          is_active?: boolean
          name_en?: string
          name_my?: string
          sort?: number
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          barcode: string | null
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          images: string[]
          is_active: boolean
          name: string
          price: number
          sale_price: number | null
          shop_category_id: string | null
          shop_id: string
          sku: string | null
          stock: number
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          images?: string[]
          is_active?: boolean
          name: string
          price: number
          sale_price?: number | null
          shop_category_id?: string | null
          shop_id: string
          sku?: string | null
          stock?: number
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          images?: string[]
          is_active?: boolean
          name?: string
          price?: number
          sale_price?: number | null
          shop_category_id?: string | null
          shop_id?: string
          sku?: string | null
          stock?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_shop_category_id_fkey"
            columns: ["shop_category_id"]
            isOneToOne: false
            referencedRelation: "shop_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          language: string
          phone: string | null
          township_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          language?: string
          phone?: string | null
          township_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          language?: string
          phone?: string | null
          township_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_township_id_fkey"
            columns: ["township_id"]
            isOneToOne: false
            referencedRelation: "townships"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          created_at: string
          ends_at: string | null
          id: string
          image_url: string | null
          is_active: boolean
          link: string | null
          sort: number
          starts_at: string
          subtitle_en: string | null
          subtitle_my: string | null
          title_en: string
          title_my: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          link?: string | null
          sort?: number
          starts_at?: string
          subtitle_en?: string | null
          subtitle_my?: string | null
          title_en: string
          title_my: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          link?: string | null
          sort?: number
          starts_at?: string
          subtitle_en?: string | null
          subtitle_my?: string | null
          title_en?: string
          title_my?: string
          updated_at?: string
        }
        Relationships: []
      }
      shop_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          shop_id: string
          sort: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          shop_id: string
          sort?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          shop_id?: string
          sort?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_categories_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_slug_history: {
        Row: {
          created_at: string
          old_slug: string
          shop_id: string
        }
        Insert: {
          created_at?: string
          old_slug: string
          shop_id: string
        }
        Update: {
          created_at?: string
          old_slug?: string
          shop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_slug_history_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shops: {
        Row: {
          address: string | null
          category_id: string | null
          cover_url: string | null
          created_at: string
          delivery_fee: number
          delivery_note: string | null
          description: string | null
          id: string
          is_active: boolean
          is_featured: boolean
          is_food: boolean
          logo_url: string | null
          name: string
          offers_delivery: boolean
          offers_pickup: boolean
          opening_hours: string | null
          owner_id: string
          phone: string | null
          pickup_info: string | null
          slug: string
          status: Database["public"]["Enums"]["shop_status"]
          township_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          category_id?: string | null
          cover_url?: string | null
          created_at?: string
          delivery_fee?: number
          delivery_note?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          is_food?: boolean
          logo_url?: string | null
          name: string
          offers_delivery?: boolean
          offers_pickup?: boolean
          opening_hours?: string | null
          owner_id: string
          phone?: string | null
          pickup_info?: string | null
          slug: string
          status?: Database["public"]["Enums"]["shop_status"]
          township_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          category_id?: string | null
          cover_url?: string | null
          created_at?: string
          delivery_fee?: number
          delivery_note?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          is_food?: boolean
          logo_url?: string | null
          name?: string
          offers_delivery?: boolean
          offers_pickup?: boolean
          opening_hours?: string | null
          owner_id?: string
          phone?: string | null
          pickup_info?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["shop_status"]
          township_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shops_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shops_township_id_fkey"
            columns: ["township_id"]
            isOneToOne: false
            referencedRelation: "townships"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          barcode: string | null
          created_at: string
          created_by: string | null
          delta: number
          id: string
          product_id: string | null
          product_name: string
          reason: string
          ref_id: string | null
          ref_type: string | null
          shop_id: string
          sku: string | null
          stock_after: number
        }
        Insert: {
          barcode?: string | null
          created_at?: string
          created_by?: string | null
          delta: number
          id?: string
          product_id?: string | null
          product_name: string
          reason: string
          ref_id?: string | null
          ref_type?: string | null
          shop_id: string
          sku?: string | null
          stock_after: number
        }
        Update: {
          barcode?: string | null
          created_at?: string
          created_by?: string | null
          delta?: number
          id?: string
          product_id?: string | null
          product_name?: string
          reason?: string
          ref_id?: string | null
          ref_type?: string | null
          shop_id?: string
          sku?: string | null
          stock_after?: number
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      townships: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name_en: string
          name_my: string
          slug: string
          sort: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name_en: string
          name_my: string
          slug: string
          sort?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name_en?: string
          name_my?: string
          slug?: string
          sort?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wishlist_items: {
        Row: {
          created_at: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_conversation: { Args: { _id: string }; Returns: boolean }
      can_view_order: { Args: { _order_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_shop_owner: { Args: { _shop_id: string }; Returns: boolean }
      media_is_public: { Args: { _path: string }; Returns: boolean }
      place_order: {
        Args: {
          p_address: string
          p_idempotency_key: string
          p_items: Json
          p_method: Database["public"]["Enums"]["delivery_method"]
          p_note: string
          p_phone: string
          p_recipient_name: string
          p_shop_id: string
          p_township_id: string
        }
        Returns: string
      }
      pos_checkout: {
        Args: {
          p_cash_received: number
          p_expected_total: number
          p_idempotency_key: string
          p_items: Json
          p_payment: string
          p_shop_id: string
        }
        Returns: Json
      }
      pos_day: { Args: { p_day?: string; p_shop_id: string }; Returns: Json }
      pos_void_sale: {
        Args: { p_items_returned: boolean; p_reason: string; p_sale_id: string }
        Returns: undefined
      }
      shop_is_public: { Args: { _shop_id: string }; Returns: boolean }
      update_order_status: {
        Args: {
          p_order_id: string
          p_status: Database["public"]["Enums"]["order_status"]
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "merchant" | "customer"
      delivery_method: "delivery" | "pickup"
      order_status:
        | "pending"
        | "confirmed"
        | "preparing"
        | "ready"
        | "out_for_delivery"
        | "completed"
        | "cancelled"
      shop_status: "pending" | "approved" | "rejected" | "suspended"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "merchant", "customer"],
      delivery_method: ["delivery", "pickup"],
      order_status: [
        "pending",
        "confirmed",
        "preparing",
        "ready",
        "out_for_delivery",
        "completed",
        "cancelled",
      ],
      shop_status: ["pending", "approved", "rejected", "suspended"],
    },
  },
} as const
