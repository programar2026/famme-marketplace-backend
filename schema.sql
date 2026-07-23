-- ============================================================
-- Esquema da base de dados — Marketplace de Moda Feminina
-- PostgreSQL
-- ============================================================

-- Utilizadoras (clientes que compram)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(30),
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Vendedoras (lojas/criadoras no marketplace)
CREATE TABLE sellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_name VARCHAR(150) NOT NULL,
  owner_name VARCHAR(150) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(30),
  password_hash TEXT NOT NULL,
  city VARCHAR(100),
  nif VARCHAR(30),                          -- número de identificação fiscal (Angola)
  plan VARCHAR(20) NOT NULL DEFAULT 'inicio', -- 'inicio' | 'crescer' | 'destaque'
  commission_rate NUMERIC(4,2) NOT NULL DEFAULT 15.00, -- percentagem
  is_verified BOOLEAN DEFAULT false,
  status VARCHAR(20) NOT NULL DEFAULT 'pendente', -- 'pendente' | 'ativa' | 'suspensa'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Categorias (fixas, conforme a estrutura da app)
CREATE TABLE categories (
  id VARCHAR(40) PRIMARY KEY,   -- ex: 'vestidos-casuais'
  label VARCHAR(100) NOT NULL,
  sort_order INT DEFAULT 0
);

INSERT INTO categories (id, label, sort_order) VALUES
  ('vestidos-casuais', 'Vestidos Casuais', 1),
  ('vestidos-gala', 'Vestidos de Gala', 2),
  ('sapatos', 'Sapatos', 3),
  ('malas', 'Malas', 4),
  ('acessorios', 'Acessórios', 5),
  ('maquilhagem', 'Maquilhagem', 6),
  ('cabelos', 'Cabelos e Perucas', 7),
  ('lingerie', 'Lingerie', 8),
  ('praia', 'Moda Praia', 9),
  ('beleza', 'Produtos de Beleza', 10);

-- Produtos
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  category_id VARCHAR(40) NOT NULL REFERENCES categories(id),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  price_kz NUMERIC(12,2) NOT NULL,     -- preço em Kwanzas
  stock INT NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'ativo', -- 'ativo' | 'esgotado' | 'inativo'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  sort_order INT DEFAULT 0
);

-- Favoritos
CREATE TABLE favorites (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, product_id)
);

-- Encomendas
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  status VARCHAR(20) NOT NULL DEFAULT 'pendente', -- 'pendente' | 'pago' | 'enviado' | 'entregue' | 'cancelado'
  total_kz NUMERIC(12,2) NOT NULL,
  payment_method VARCHAR(30),   -- 'multicaixa_express' | 'transferencia' | etc.
  payment_ref VARCHAR(100),
  shipping_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Cada encomenda pode ter peças de várias vendedoras — por isso
-- cada item guarda também o seller_id e a comissão aplicada nesse momento.
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  seller_id UUID NOT NULL REFERENCES sellers(id),
  quantity INT NOT NULL DEFAULT 1,
  unit_price_kz NUMERIC(12,2) NOT NULL,
  commission_rate NUMERIC(4,2) NOT NULL,      -- taxa aplicada nesta venda
  seller_payout_kz NUMERIC(12,2) NOT NULL     -- valor líquido devido à vendedora
);

-- Subscrições das vendedoras (planos pagos)
CREATE TABLE seller_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  plan VARCHAR(20) NOT NULL,          -- 'inicio' | 'crescer' | 'destaque'
  price_kz NUMERIC(10,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ativa', -- 'ativa' | 'atrasada' | 'cancelada'
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices úteis
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_seller ON products(seller_id);
CREATE INDEX idx_order_items_seller ON order_items(seller_id);
CREATE INDEX idx_orders_user ON orders(user_id);
