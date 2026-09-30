-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'SHOP_OWNER';
ALTER TYPE "UserRole" ADD VALUE 'PARTNER';

-- DropForeignKey
ALTER TABLE orders DROP CONSTRAINT orders_user_id_fkey;

-- AlterTable
ALTER TABLE orders ADD COLUMN     guest_session_id VARCHAR(100),
ALTER COLUMN user_id DROP NOT NULL;

-- AlterTable
ALTER TABLE shops ADD COLUMN     city VARCHAR(100),
ADD COLUMN     created_by_partner_id UUID,
ADD COLUMN     duplex_discount DECIMAL(6,2) NOT NULL DEFAULT 0.00,
ADD COLUMN     operating_hours VARCHAR(100),
ADD COLUMN     owner_id UUID,
ADD COLUMN     pincode VARCHAR(10),
ADD COLUMN     price_per_page_bw DECIMAL(6,2) NOT NULL DEFAULT 2.00,
ADD COLUMN     price_per_page_color DECIMAL(6,2) NOT NULL DEFAULT 10.00,
ADD COLUMN     public_shop_id VARCHAR(50) NOT NULL,
ALTER COLUMN phone SET DATA TYPE VARCHAR(20);

-- AlterTable
ALTER TABLE users ADD COLUMN     first_login BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN phone SET DATA TYPE VARCHAR(20);

-- CreateTable
CREATE TABLE devices (
    id UUID NOT NULL,
    shop_id UUID NOT NULL,
    device_id VARCHAR(100) NOT NULL,
    name VARCHAR(100) NOT NULL,
    device_key VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'OFFLINE',
    last_heartbeat TIMESTAMP(3),
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL,

    CONSTRAINT devices_pkey PRIMARY KEY (id)
);

-- CreateIndex
CREATE UNIQUE INDEX devices_device_id_key ON devices(device_id);

-- CreateIndex
CREATE INDEX devices_shop_id_idx ON devices(shop_id);

-- CreateIndex
CREATE INDEX orders_guest_session_id_idx ON orders(guest_session_id);

-- CreateIndex
CREATE UNIQUE INDEX shops_public_shop_id_key ON shops(public_shop_id);

-- CreateIndex
CREATE INDEX shops_owner_id_idx ON shops(owner_id);

-- CreateIndex
CREATE INDEX shops_public_shop_id_idx ON shops(public_shop_id);

-- CreateIndex
CREATE INDEX shops_created_by_partner_id_idx ON shops(created_by_partner_id);

-- AddForeignKey
ALTER TABLE shops ADD CONSTRAINT shops_created_by_partner_id_fkey FOREIGN KEY (created_by_partner_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE shops ADD CONSTRAINT shops_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE orders ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE devices ADD CONSTRAINT devices_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE ON UPDATE CASCADE;
