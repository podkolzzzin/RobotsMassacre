using System;
using System.Collections.Generic;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Entity;
using Level;
using Gfx;

namespace Inventory
{
    public class TurretInv : InvItem
    {
        public override int ImageIconIndex { get { return 7; } }
        public override int[] ItemImageIndexes { get { return new int[] { 0, 16 }; } }
        public override int HologramIndex { get { return 0; } }
        public override int ActivationKey { get { return 2; } }

		public override InvType Type { get { return InvType.Turret; } }

        public override void Use(int playerId)
        {
            if (GameLevel.CreateEntity(new Turret(0, 0, 0), playerId))
            {
                base.Use();
            }
        }

        public override string ToString()
        {
            return "inventory-turret";
        }
    }
}