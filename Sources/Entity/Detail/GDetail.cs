using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Entity.Tile;

namespace Entity.Details
{
    public class GDetail : GTile
    {
        public GDetail(float x, float y) : base(x, y, true) { }

        public GDetail(float x, float y, Directions Dir, bool immortal)
            : base(x, y, immortal)
        {
            Direction = Dir;
        }
    }
}