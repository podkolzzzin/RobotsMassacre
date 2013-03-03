using System;
using System.Collections.Generic;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Entity;
using Level;

namespace Inventory
{
    public class MineInv : InvItem
    {
        public override int ImageIconIndex { get { return 8; } }
        public override int[] ItemImageIndexes { get { return new int[] { 8, 1 }; } }
        public override int HologramIndex { get { return 2; } }
        public override int ActivationKey { get { return 3; } }

		public override InvType Type { get { return InvType.Mine; } }

        public override void Use(int playerId)
        {
            if (GameLevel.CreateEntity(new Mine(0, 0, 0), playerId))
            {
                base.Use();
            }
        }

        public override string ToString()
        {
            return "inventory-mine";
        }
    }
}